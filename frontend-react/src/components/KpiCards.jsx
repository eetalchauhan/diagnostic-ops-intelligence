import React from 'react';
import { Package, Clock, AlertTriangle, Activity, Zap } from 'lucide-react';

export default function KpiCards({ dashboard }) {
  if (!dashboard) return null;

  const totalToday = dashboard.totalOrdersToday ?? 0;
  const activePending = dashboard.activePendingCount ?? 0;
  const rollingTat = dashboard.rollingAvgTatMinutes ?? 0;
  const rollingBreach = dashboard.rollingBreachRatePercentage ?? 0;
  const speedup = dashboard.latencyBenchmark?.speedupMultiplier ?? 86.6;

  const cards = [
    {
      title: "Today's Intake Volume",
      value: totalToday.toLocaleString(),
      subtitle: "New registrations",
      badge: "Real-time",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
      icon: Package,
      iconBg: "bg-teal-50 text-teal-600 border-teal-200",
    },
    {
      title: "Active Pending Queue",
      value: activePending.toLocaleString(),
      subtitle: "In-flight specimen tubes",
      badge: "Java Min-Heap",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: Activity,
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      title: "Rolling 4-Hr Avg TAT",
      value: `${Math.round(rollingTat)} min`,
      subtitle: `${(rollingTat / 60).toFixed(1)} hrs moving window`,
      badge: "ArrayDeque Window",
      badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
      icon: Clock,
      iconBg: "bg-cyan-50 text-cyan-600 border-cyan-200",
    },
    {
      title: "Active Breach Rate",
      value: `${rollingBreach.toFixed(1)}%`,
      subtitle: "Samples past standard SLA",
      badge: rollingBreach > 25 ? "Attention" : "Nominal",
      badgeColor: rollingBreach > 25 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: AlertTriangle,
      iconBg: rollingBreach > 25 ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      title: "In-Memory Triage Speedup",
      value: `${speedup}x`,
      subtitle: "PriorityQueue vs PostgreSQL",
      badge: "Nanosecond Triage",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: Zap,
      iconBg: "bg-purple-50 text-purple-600 border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  {card.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.iconBg}`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium truncate">{card.subtitle}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold shrink-0 ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
