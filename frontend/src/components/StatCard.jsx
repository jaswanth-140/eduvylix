function StatCard({ title, value, subtitle, accent = "bg-mint" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`inline-block rounded-full ${accent} px-3 py-1 text-xs font-bold uppercase tracking-wide`}>
        {title}
      </div>
      <p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export default StatCard;
