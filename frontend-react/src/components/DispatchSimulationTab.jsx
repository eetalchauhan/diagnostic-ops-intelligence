import React, { useState, useEffect } from 'react';
import {
  Cpu, Zap, Clock, ShieldAlert, ArrowDownUp, CheckCircle,
  RefreshCw, Award, BarChart3, Layers
} from 'lucide-react';
import { fetchSimulation, fetchBenchmark } from '../services/api';

export default function DispatchSimulationTab() {
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
      setSimulationItems(simData);
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
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
              <span>Dynamic Multi-Parameter Scheduler</span>
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

      {/* Operational Latency Comparison Card */}
      {benchmark && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-xs border border-slate-700 hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Real-Time Dispatch Engine</span>
              <Zap className="w-4 h-4 text-teal-400" />
            </div>
            <h4 className="text-2xl font-black font-mono mt-2">
              {benchmark.dsaTriageLatencyMs} ms
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              ({benchmark.dsaTriageLatencyNanos.toLocaleString()} ns)
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Database Query Sync</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <h4 className="text-2xl font-black font-mono text-slate-900 mt-2">
              {benchmark.databaseQueryLatencyMs} ms
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              ({benchmark.databaseQueryLatencyNanos.toLocaleString()} ns)
            </p>
          </div>

          <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-xl p-5 shadow-xs border border-teal-700/60 hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Throughput Advantage</span>
              <Award className="w-4 h-4 text-teal-300" />
            </div>
            <h4 className="text-2xl font-black font-mono mt-2 text-teal-200">
              {benchmark.speedupMultiplier}x
            </h4>
            <p className="text-[11px] text-teal-300/80 mt-1">
              Optimized triage dispatch speedup
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Evaluated</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <h4 className="text-2xl font-black font-mono text-slate-900 mt-2">
              {benchmark.activePendingSamplesCount}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Specimens actively prioritized
            </p>
          </div>
        </div>
      )}

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
