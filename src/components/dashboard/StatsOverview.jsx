export default function StatsOverview({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat label="Total" value={stats.total} />
      <Stat label="Pending" value={stats.pending} />
      <Stat label="In Progress" value={stats.inProgress} />
      <Stat label="Review" value={stats.review} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow border border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-[#2d4650]">{value}</p>
    </div>
  );
}
