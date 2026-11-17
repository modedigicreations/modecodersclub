import { parse } from "node-html-parser";

/**
 * Auto-grading for browser coding labs. Checks are written one per line in a
 * small format instructors (and A-EduNet) can type:
 *
 *   html: h1                                  an <h1> exists
 *   html: ul > li *3                          at least 3 matching elements
 *   html: h1 "Welcome"                        an <h1> whose text contains "Welcome"
 *   css: body { background-color }            a rule for `body` sets background-color
 *   css: h1 { color: red }                    ...and its value contains "red"
 *   js: addEventListener                      the JavaScript contains this text
 *
 * Anything after " | " is the message the learner sees, e.g.
 *   html: img[alt] | Give your image alt text
 *
 * Grading is static and runs on the server: the learner's code is parsed,
 * never executed, so it can't fake a pass or run anything on the server.
 */

export type LabCheck =
  | { kind: "html"; selector: string; min: number; text?: string; message: string }
  | { kind: "css"; selector: string; property: string; value?: string; message: string }
  | { kind: "js"; text: string; message: string };

export type LabCode = { html: string; css: string; js: string };
export type CheckResult = { message: string; passed: boolean };

export const MAX_CHECKS = 20;
const MAX_LINE = 300;

/** Parses the instructor's lines. Returns the checks and a message per bad line. */
export function parseChecks(source: string): { checks: LabCheck[]; errors: string[] } {
  const checks: LabCheck[] = [];
  const errors: string[] = [];
  const lines = source.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (const [index, line] of lines.entries()) {
    const n = index + 1;
    if (checks.length >= MAX_CHECKS) {
      errors.push(`At most ${MAX_CHECKS} checks per lab.`);
      break;
    }
    if (line.length > MAX_LINE) {
      errors.push(`Check ${n} is longer than ${MAX_LINE} characters.`);
      continue;
    }
    const check = parseLine(line);
    if (typeof check === "string") errors.push(`Check ${n} ("${line.slice(0, 60)}"): ${check}`);
    else checks.push(check);
  }
  return { checks, errors };
}

function parseLine(line: string): LabCheck | string {
  const bar = line.indexOf(" | ");
  const body = (bar === -1 ? line : line.slice(0, bar)).trim();
  const custom = bar === -1 ? "" : line.slice(bar + 3).trim();
  const m = /^(html|css|js)\s*:\s*(.+)$/i.exec(body);
  if (!m) return 'start with "html:", "css:" or "js:".';
  const kind = m[1]!.toLowerCase();
  const rest = m[2]!.trim();

  if (kind === "js") {
    return { kind: "js", text: rest, message: custom || `Your JavaScript uses ${rest}` };
  }

  if (kind === "css") {
    const c = /^([^{}]+)\{\s*([a-z-]+)\s*(?::\s*([^{};]+?))?\s*;?\s*\}$/i.exec(rest);
    if (!c) return 'write it as "css: selector { property }" or "css: selector { property: value }".';
    const selector = normaliseSelector(c[1]!);
    const property = c[2]!.toLowerCase();
    const value = c[3]?.trim();
    return {
      kind: "css",
      selector,
      property,
      ...(value ? { value } : {}),
      message: custom || `Your CSS sets ${property}${value ? `: ${value}` : ""} on ${selector}`,
    };
  }

  // html: selector [*N] ["text"]
  const h = /^(.+?)(?:\s+\*(\d{1,2}))?(?:\s+"([^"]+)")?$/.exec(rest);
  if (!h) return "couldn't read the selector.";
  const selector = h[1]!.trim();
  const min = h[2] ? Number(h[2]) : 1;
  const text = h[3];
  if (min < 1) return "the count after * must be at least 1.";
  try {
    parse("<div></div>").querySelectorAll(selector);
  } catch {
    return `"${selector}" isn't a valid CSS selector.`;
  }
  const what = min > 1 ? `at least ${min} ${selector} elements` : `a ${selector} element`;
  return {
    kind: "html",
    selector,
    min,
    ...(text ? { text } : {}),
    message: custom || `Your HTML has ${what}${text ? ` containing "${text}"` : ""}`,
  };
}

/** Back to the editable text form (for the instructor's textarea). */
export function formatChecks(checks: LabCheck[]): string {
  return checks
    .map((c) => {
      const body =
        c.kind === "js"
          ? `js: ${c.text}`
          : c.kind === "css"
            ? `css: ${c.selector} { ${c.property}${c.value ? `: ${c.value}` : ""} }`
            : `html: ${c.selector}${c.min > 1 ? ` *${c.min}` : ""}${c.text ? ` "${c.text}"` : ""}`;
      return `${body} | ${c.message}`;
    })
    .join("\n");
}

/** Reads checks stored in Lab.checks (JSON), dropping anything malformed. */
export function storedChecks(value: unknown): LabCheck[] {
  if (!Array.isArray(value)) return [];
  return value.filter((c): c is LabCheck => {
    if (!c || typeof c !== "object" || typeof (c as LabCheck).message !== "string") return false;
    const k = (c as LabCheck).kind;
    return k === "html" || k === "css" || k === "js";
  });
}

export function gradeLab(checks: LabCheck[], code: LabCode): CheckResult[] {
  const doc = checks.some((c) => c.kind === "html") ? parse(code.html.slice(0, 20_000)) : null;
  const rules = checks.some((c) => c.kind === "css") ? cssRules(code.css) : [];
  const js = squash(stripJsComments(code.js));
  return checks.map((c) => {
    let passed = false;
    try {
      if (c.kind === "html") {
        const found = doc!.querySelectorAll(c.selector);
        const matching = c.text ? found.filter((el) => squash(el.text).includes(squash(c.text!))) : found;
        passed = matching.length >= c.min;
      } else if (c.kind === "css") {
        passed = rules.some(
          (r) =>
            r.selectors.includes(c.selector) &&
            r.declarations.some(
              (d) => d.property === c.property && (!c.value || squash(d.value).includes(squash(c.value))),
            ),
        );
      } else {
        passed = js.includes(squash(c.text));
      }
    } catch {
      passed = false;
    }
    return { message: c.message, passed };
  });
}

type CssRule = { selectors: string[]; declarations: { property: string; value: string }[] };

function cssRules(css: string): CssRule[] {
  const clean = css.slice(0, 20_000).replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  // Innermost "selector { declarations }" blocks, so rules inside @media count too.
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectorText = m[1]!.trim();
    if (selectorText.startsWith("@")) continue;
    rules.push({
      selectors: selectorText.split(",").map(normaliseSelector),
      declarations: m[2]!
        .split(";")
        .map((d) => d.split(":"))
        .filter((p) => p.length >= 2)
        .map(([prop, ...val]) => ({ property: prop!.trim().toLowerCase(), value: val.join(":").trim() })),
    });
  }
  return rules;
}

function normaliseSelector(s: string) {
  return s.trim().replace(/\s*([>+~])\s*/g, " $1 ").replace(/\s+/g, " ").toLowerCase();
}

function squash(s: string) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function stripJsComments(js: string) {
  return js.slice(0, 20_000).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}
