type ResourceDefaults = {
  slug?: string;
  name?: string;
  category?: string;
  description?: string;
  icon?: string;
  color?: string;
  time?: string;
};

const COLORS = ["orange", "mint", "lavender", "blue", "pink", "teal"];

export function ResourceForm({
  action,
  defaults,
  submitLabel,
  slugEditable = true,
}: {
  action: (formData: FormData) => void;
  defaults?: ResourceDefaults;
  submitLabel: string;
  slugEditable?: boolean;
}) {
  return (
    <form className="admin-form" action={action}>
      <div>
        <label htmlFor="slug">Slug</label>
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
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={defaults?.description} required />
      </div>
      <div className="admin-form-row">
        <div>
          <label htmlFor="icon">Icon (short text)</label>
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
      <div>
        <label htmlFor="time">Time (e.g. &quot;1 hour&quot; or &quot;Self-paced&quot;)</label>
        <input id="time" name="time" defaultValue={defaults?.time} required />
      </div>
      <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
        {submitLabel}
      </button>
    </form>
  );
}
