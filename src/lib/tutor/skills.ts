import { LITERACY_SKILLS } from "./literacy";
import { NUMERACY_SKILLS } from "./numeracy";
import { createRng } from "./rng";
import type { PublicItem, Skill, Track, TutorItem } from "./types";

export const TRACKS: Record<Track, { title: string; short: string; emoji: string }> = {
  literacy: { title: "Reading & Writing", short: "Reading", emoji: "📖" },
  numeracy: { title: "Maths", short: "Maths", emoji: "🔢" },
};

export const SKILLS: Skill[] = [...LITERACY_SKILLS, ...NUMERACY_SKILLS];
const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): Skill | undefined {
  return BY_ID.get(id);
}

/** The ladder for a track, easiest first. */
export function trackSkills(track: Track): Skill[] {
  return SKILLS.filter((s) => s.track === track);
}

export function isTrack(value: unknown): value is Track {
  return value === "literacy" || value === "numeracy";
}

/** Rebuild a question exactly from its skill and seed. */
export function buildItem(skillId: string, seed: number): TutorItem | null {
  const skill = getSkill(skillId);
  return skill ? skill.generate(createRng(seed)) : null;
}

export function toPublic(item: TutorItem): PublicItem {
  const pub: PublicItem & Partial<Pick<TutorItem, "answer" | "accept" | "explain">> = { ...item };
  delete pub.answer;
  delete pub.accept;
  delete pub.explain;
  return pub;
}
