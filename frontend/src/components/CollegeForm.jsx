import { useState, useEffect } from "react";

function CollegeForm({ selected, onSubmit, onCancel, submitError }) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
  });

  useEffect(() => {
    if (selected) {
      setFormData({
        name: selected.name || "",
        location: selected.location || "",
      });
    } else {
      setFormData({
        name: "",
        location: "",
      });
    }
  }, [selected]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-bold uppercase tracking-wider text-slate-400">College Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Stanford University"
          className="edv-input w-full"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold uppercase tracking-wider text-slate-400">Location</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g. California, USA"
          className="edv-input w-full"
          required
        />
      </div>

      {submitError && (
        <div className="rounded-2xl border border-rose-700/50 bg-rose-900/20 p-4">
          <p className="text-sm font-semibold text-rose-200">{submitError}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="edv-btn-primary flex-1 rounded-2xl py-3 font-extrabold">
          {selected ? "Update College" : "Create College"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 py-3 font-semibold text-slate-200 transition hover:bg-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CollegeForm;
