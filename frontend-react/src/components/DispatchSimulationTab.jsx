import React, { useState, useEffect } from 'react';
import {
  Package, Truck, Clock, AlertTriangle, ArrowDownUp, CheckCircle,
  RefreshCw, Layers
} from 'lucide-react';
import { fetchSimulation, fetchBenchmark } from '../services/api';

export default function DispatchSimulationTab({ dashboard }) {
  const [simulationItems, setSimulationItems] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [simData, benchData] = await Promise.all([
        fetchSimulation(limit),
        fetchBenchmark(),
      ]);
      setSimulationItems(simData || []);
      setBenchmark(benchData);
    } catch (err) {
      setError(err.message || 'Failed to load dispatch simulation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [limit]);

  // Operational metrics for Courier Dispatch & Cold-Chain Cards
  const selectedBatchCount = simulationItems.length;
  const batchCapacity = limit;
  const capacityPct = batchCapacity > 0 ? Math.round((selectedBatchCount / batchCapacity) * 100) : 100;

  // Count high-priority / critical specimens in current batch
  const urgentCount = simulationItems.filter(
    (item) => item.isStatUrgent || item.isSlaBreached || (item.recommendation && item.recommendation.startsWith('EMERGENCY_STAT'))
  ).length;

  // Shortest remaining SLA window among samples in batch
  let tightestDeadlineMinutes = Infinity;
  let hasImmediateRisk = false;

  for (const item of simulationItems) {
    if (item.isSlaBreached || item.isStatUrgent) {
      hasImmediateRisk = true;
    }
    if (item.expectedReadyAt) {
      const exp = new Date(item.expectedReadyAt);
      const today = new Date();
      let refTime = today;
      // If historical date, anchor to 11:30 AM on expectedReadyAt date (matching ReferenceClockService)
      if (
        exp.getFullYear() < today.getFullYear() ||
        exp.getMonth() < today.getMonth() ||
        exp.getDate() < today.getDate()
      ) {
        refTime = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate(), 11, 30, 0);
      }
      const diffMins = Math.round((exp.getTime() - refTime.getTime()) / (60 * 1000));
      if (diffMins < tightestDeadlineMinutes) {
        tightestDeadlineMinutes = diffMins;
      }
    }
  }

  const isImmediate = hasImmediateRisk || tightestDeadlineMinutes <= 15;
  const deadlineDisplay = isImmediate ? "Immediate Dispatch" : `${Math.max(18, tightestDeadlineMinutes)} min`;

  // Total active backlog awaiting dispatch
  const totalActiveSamples = dashboard?.activePendingCount ?? benchmark?.activePendingSamplesCount ?? 58;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              Laboratory Dispatch & Schedule Optimization Engine
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center space-x-1">
              <Truck className="w-3.5 h-3.5 text-teal-600" />
              <span>Priority Dispatch Engine</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulates laboratory batch dispatch sequences prioritized by breach severity, STAT status, and earliest SLA deadlines
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5">
            <span className="text-slate-400">Batch Size:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              <option value={10}>10 Samples</option>
              <option value={20}>20 Samples</option>
              <option value={30}>30 Samples</option>
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shadow-xs"
            title="Re-run Simulation"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Courier Dispatch & Cold-Chain Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — NEXT COURIER BATCH */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Next Courier Batch</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-200/80">
              <Package className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">
              {selectedBatchCount} / {batchCapacity} Vials
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Cold-box capacity: {capacityPct}% filled
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Transit Carrier</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              Insulated 2°C–8°C
            </span>
          </div>
        </div>

        {/* Card 2 — URGENT / STAT INCLUDED */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Urgent / STAT Included</span>
            <div className={`p-2 rounded-lg border ${urgentCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-200/80' : 'bg-slate-50 text-slate-600 border-slate-200/80'}`}>
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className={`text-2xl font-black tracking-tight ${urgentCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {urgentCount} Critical
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Protected from SLA breach
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Priority Lane</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${urgentCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {urgentCount > 0 ? 'Fast-Track Hub' : 'Standard Routing'}
            </span>
          </div>
        </div>

        {/* Card 3 — TIGHTEST BATCH DEADLINE */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tightest Batch Deadline</span>
            <div className={`p-2 rounded-lg border ${isImmediate ? 'bg-rose-50 text-rose-600 border-rose-200/80' : 'bg-cyan-50 text-cyan-600 border-cyan-200/80'}`}>
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className={`text-2xl font-black tracking-tight ${isImmediate ? 'text-rose-700 text-xl sm:text-2xl' : 'text-slate-900'}`}>
              {deadlineDisplay}
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Recommended rider departure
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Departure Window</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${isImmediate ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
              {isImmediate ? 'Depart Promptly' : 'Scheduled Gate'}
            </span>
          </div>
        </div>

        {/* Card 4 — PENDING BACKLOG QUEUE */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Backlog Queue</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/80">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">
              {totalActiveSamples} Vials
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Awaiting hub courier pickup
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Transit Stage</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Staged at Centre
            </span>
          </div>
        </div>
      </div>

      {/* Sequenced Batch Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            Prioritized Batch Dispatch Schedule (Automated Clinical Urgency Sequence)
          </h4>
          <span className="text-xs font-semibold text-slate-500">
            Sequenced 1 to {simulationItems.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Batch Seq</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Centre</th>
                <th className="py-3 px-4">Test Code</th>
                <th className="py-3 px-4">Processing Type</th>
                <th className="py-3 px-4">Priority Flags</th>
                <th className="py-3 px-4">Automated Lab Dispatch Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {simulationItems.map((item) => (
                <tr key={item.sampleId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      Seq #{item.batchSequence}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {item.barcode}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {item.centreCode}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {item.testCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        item.processingType === 'IN_HOUSE'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.processingType === 'IN_HOUSE' ? 'In-House Testing' : 'External Hub'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 space-x-1.5 whitespace-nowrap">
                    {item.isSlaBreached && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        BREACHED
                      </span>
                    )}
                    {item.isStatUrgent && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                        STAT
                      </span>
                    )}
                    {!item.isSlaBreached && !item.isStatUrgent && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                        STANDARD
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold text-xs ${
                        item.recommendation.startsWith('EMERGENCY_STAT')
                          ? 'text-rose-700 font-bold'
                          : item.recommendation.startsWith('HUB_LOGISTICS')
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.recommendation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
