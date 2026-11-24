import React from 'react';
import { Package, Clock, AlertTriangle, Activity, ShieldCheck } from 'lucide-react';

export default function KpiCards({ dashboard }) {
  if (!dashboard) return null;

  const totalToday = dashboard.totalOrdersToday ?? 0;
  const activePending = dashboard.activePendingCount ?? 0;
  const rollingTat = dashboard.rollingAvgTatMinutes ?? 0;
  const rollingBreach = dashboard.rollingBreachRatePercentage ?? 0;

  // Operational KPI: On-Time SLA Compliance Rate (NABL Standard)
  const complianceRate = Math.max(0, Math.min(100, 100 - rollingBreach));
  const isComplianceOptimal = complianceRate >= 90.0;

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
      subtitle: "In-centre vials",
      badge: "Priority Sorted",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: Activity,
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      title: "Rolling 4-Hr Avg TAT",
      value: `${Math.round(rollingTat)} min`,
      subtitle: `${(rollingTat / 60).toFixed(1)} hrs moving window`,
      badge: "4-Hr Rolling",
      badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
      icon: Clock,
      iconBg: "bg-cyan-50 text-cyan-600 border-cyan-200",
    },
    {
      title: "Active Breach Rate",
      value: `${rollingBreach.toFixed(1)}%`,
      subtitle: "Past SLA target",
      badge: rollingBreach > 15 ? "Attention" : "Nominal",
      badgeColor: rollingBreach > 15 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: AlertTriangle,
      iconBg: rollingBreach > 15 ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      title: "On-Time SLA Compliance",
      value: `${complianceRate.toFixed(1)}%`,
      subtitle: "Within SLA target",
      badge: "NABL Target",
      badgeColor: isComplianceOptimal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200",
      icon: ShieldCheck,
      iconBg: isComplianceOptimal ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {card.title}
                </p>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
                  {card.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.iconBg} group-hover:scale-105 transition-transform duration-200`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium truncate">{card.subtitle}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0 ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
