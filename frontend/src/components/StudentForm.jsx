import { useEffect, useState } from "react";

const initialState = {
  name: "",
  roll_number: "",
  college_id: "",
  department: "",
  year: 1,
  bio: "",
  contact_email: "",
  contact_phone: "",
  behavior: 0,
};

const initialJustification = {
  category: "",
  reason: "",
  details: "",
};

function StudentForm({ colleges, selected, onSubmit, onCancel, submitError = "" }) {
  const [form, setForm] = useState(initialState);
  const [justification, setJustification] = useState(initialJustification);

  useEffect(() => {
    if (selected) {
      setForm({
        ...selected,
        college_id: selected.college_id || "",
      });
      setJustification(initialJustification);
    } else {
      setForm(initialState);
      setJustification(initialJustification);
    }
  }, [selected]);

  useEffect(() => {
    if (selected) return;
    if (form.college_id) return;
    if (!colleges.length) return;
    setForm((prev) => ({ ...prev, college_id: colleges[0]._id }));
  }, [colleges, selected, form.college_id]);

  const score = Number(form.behavior || 0).toFixed(2);

  const metricsChanged = Boolean(
    selected &&
      Number(form.behavior) !== Number(selected.behavior)
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(
      {
        ...form,
        behavior: Number(form.behavior),
        year: Number(form.year),
      },
      {
        metricsChanged,
        justification: metricsChanged
          ? {
              category: justification.category,
              reason: justification.reason,
              details: justification.details,
            }
          : null,
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-extrabold text-slate-900">{selected ? "Edit Student" : "Add Student"}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Student name" className="input-ui" required />
        <input
          name="roll_number"
          value={form.roll_number}
          onChange={handleChange}
          placeholder="Roll number"
          className="input-ui"
          required
          disabled={Boolean(selected)}
        />
        <select name="college_id" value={form.college_id} onChange={handleChange} className="input-ui" required>
          <option value="">Select college</option>
          {colleges.map((college) => (
            <option key={college._id} value={college._id}>
              {college.name}
            </option>
          ))}
        </select>
        <input name="department" value={form.department} onChange={handleChange} placeholder="Department" className="input-ui" required />
        <input name="year" type="number" min="1" max="6" value={form.year} onChange={handleChange} className="input-ui" required />

        <input
          name="contact_email"
          value={form.contact_email || ""}
          onChange={handleChange}
          placeholder="Contact email (optional)"
          className="input-ui"
          type="email"
        />
        <input
          name="contact_phone"
          value={form.contact_phone || ""}
          onChange={handleChange}
          placeholder="Contact phone (optional)"
          className="input-ui"
        />

        <textarea
          name="bio"
          value={form.bio || ""}
          onChange={handleChange}
          placeholder="Bio / Profile description (optional)"
          className="input-ui md:col-span-2"
          rows={3}
        />

        <input name="behavior" type="number" min="-100" max="100" value={form.behavior} onChange={handleChange} className="input-ui" required />
      </div>
      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Auto Discipline Score: {score}</div>
      {!colleges.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
          No college found. Create a college first, then add students.
        </div>
      ) : null}
      {submitError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{submitError}</div>
      ) : null}

      {selected && metricsChanged && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-sm font-extrabold text-slate-900">Discipline Update Justification (Required)</p>
          <p className="mt-1 text-xs text-slate-500">Any change to behavior must be justified.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              value={justification.category}
              onChange={(e) => setJustification((prev) => ({ ...prev, category: e.target.value }))}
              className="input-ui"
              required
            >
              <option value="">Select category</option>
              <option value="Behavior Issue">Behavior Issue</option>
              <option value="Good Performance">Good Performance</option>
              <option value="Other">Other</option>
            </select>
            <input
              value={justification.reason}
              onChange={(e) => setJustification((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Short reason (required)"
              className="input-ui"
              required
            />
            <textarea
              value={justification.details}
              onChange={(e) => setJustification((prev) => ({ ...prev, details: e.target.value }))}
              placeholder="Optional details"
              className="input-ui md:col-span-2"
              rows={3}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          {selected ? "Update" : "Create"}
        </button>
        {selected && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default StudentForm;
