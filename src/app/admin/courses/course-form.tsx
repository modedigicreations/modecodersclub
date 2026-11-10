type CourseDefaults = {
  slug?: string;
  name?: string;
  category?: string;
  level?: string;
  description?: string;
  icon?: string;
  color?: string;
  duration?: string;
  price?: string;
  audience?: string;
  outcomes?: string[];
  isFree?: boolean;
};

const COLORS = ["orange", "mint", "lavender", "blue", "pink", "teal"];

export function CourseForm({
  action,
  defaults,
  submitLabel,
  slugEditable = true,
}: {
  action: (formData: FormData) => void;
  defaults?: CourseDefaults;
  submitLabel: string;
  slugEditable?: boolean;
}) {
  return (
    <form className="admin-form" action={action}>
      <div>
        <label htmlFor="slug">Slug (URL)</label>
        <input id="slug" name="slug" defaultValue={defaults?.slug} readOnly={!slugEditable} required />
      </div>
      <div className="admin-form-row">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
        <div>
          <label htmlFor="category">Category</label>
          <input id="category" name="category" defaultValue={defaults?.category} required />
        </div>
      </div>
      <div>
        <label htmlFor="level">Tagline (shown as the small kicker)</label>
        <input id="level" name="level" defaultValue={defaults?.level} required />
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={defaults?.description} required />
      </div>
      <div className="admin-form-row">
        <div>
          <label htmlFor="icon">Icon (short text, e.g. &quot;AI&quot; or &quot;{"{ }"}&quot;)</label>
          <input id="icon" name="icon" defaultValue={defaults?.icon} maxLength={4} required />
        </div>
        <div>
          <label htmlFor="color">Color</label>
          <select id="color" name="color" defaultValue={defaults?.color ?? COLORS[0]} required>
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-form-row">
        <div>
          <label htmlFor="duration">Duration</label>
          <input id="duration" name="duration" defaultValue={defaults?.duration} required />
        </div>
        <div>
          <label htmlFor="price">Price</label>
          <input id="price" name="price" defaultValue={defaults?.price} required />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          id="isFree"
          name="isFree"
          type="checkbox"
          defaultChecked={defaults?.isFree ?? true}
          style={{ width: "auto" }}
        />
        <label htmlFor="isFree" style={{ marginBottom: 0, textTransform: "none", fontSize: 13, color: "var(--ink)" }}>
          Free (uncheck to require an active subscription to enroll)
        </label>
      </div>
      <div>
        <label htmlFor="audience">Who it&rsquo;s for</label>
        <input id="audience" name="audience" defaultValue={defaults?.audience} required />
      </div>
      <div>
        <label htmlFor="outcomes">Outcomes (one per line)</label>
        <textarea
          id="outcomes"
          name="outcomes"
          defaultValue={defaults?.outcomes?.join("\n")}
          style={{ minHeight: 120 }}
          required
        />
      </div>
      <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
        {submitLabel}
      </button>
    </form>
  );
}
