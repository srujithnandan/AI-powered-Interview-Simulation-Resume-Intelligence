export default function ScoreCard({ title, value, subtitle, icon, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-cyan-50 text-cyan-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
  };

  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-black/5 ${colors[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
