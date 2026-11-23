import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import {
  AlertCircle, ShieldAlert, ArrowRight, CheckCircle2,
  Filter, Flame, ChevronRight, RefreshCw, Send
} from 'lucide-react';
import { updateSampleStatus } from '../services/api';

const DONUT_COLORS = ['#0d9488', '#f59e0b']; // In-House (Teal), External Hub (Amber)

export default function LiveOperationsTab({ dashboard, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [statusModalSample, setStatusModalSample] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('ACCESSIONED');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  if (!dashboard) return null;

  // 1. Prepare Top Test Code Frequency Data for BarChart (from Java HashMap)
  const testFrequencies = Object.entries(dashboard.topTestFrequencies || {}).map(([code, count]) => ({
    name: code,
    count: count,
  })).slice(0, 8); // Top 8 diagnostic tests

  // 2. Prepare Donut Chart Data (In-House vs External Hub)
  const procSplitData = [
    { name: 'In-House Processing', value: dashboard.inHouseCount || 0, pct: dashboard.inHousePercentage || 0 },
    { name: 'External Hub Logistics', value: dashboard.externalHubCount || 0, pct: dashboard.externalHubPercentage || 0 },
  ];

  // 3. Prepare Hourly Congestion Data
  const hourlyData = (dashboard.hourlyIntakeDistribution || []).map((item) => ({
    hourLabel: `${String(item.hour).padStart(2, '0')}:00`,
    volume: item.volume,
  }));

  // 4. At-risk samples from Java Min-Heap PriorityQueue
  const triageNodes = dashboard.topAtRiskSamples || [];

  const handleQuickAdvance = async (sample) => {
    let nextStatus = 'ACCESSIONED';
    if (sample.currentStatus === 'COLLECTED') {
      nextStatus = 'ACCESSIONED';
    } else if (sample.currentStatus === 'ACCESSIONED') {
      nextStatus = sample.processingType === 'IN_HOUSE' ? 'IN_HOUSE_PROCESSING' : 'DISPATCHED_TO_HUB';
    } else if (sample.currentStatus === 'IN_HOUSE_PROCESSING' || sample.currentStatus === 'DISPATCHED_TO_HUB') {
      nextStatus = 'REPORT_GENERATED';
    } else if (sample.currentStatus === 'REPORT_GENERATED') {
      nextStatus = 'DELIVERED';
    }

    try {
      setUpdatingId(sample.sampleId);
      await updateSampleStatus(sample.sampleId, nextStatus, `Quick advance via Live Triage dashboard to ${nextStatus}`);
      setActionMessage({ type: 'success', text: `Sample ${sample.barcode} advanced to ${nextStatus}` });
      setTimeout(() => setActionMessage(null), 4000);
      onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: `Failed to update status: ${err.message}` });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCustomStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalSample) return;

    try {
      setUpdatingId(statusModalSample.sampleId);
      await updateSampleStatus(statusModalSample.sampleId, selectedStatus, statusRemarks);
      setActionMessage({ type: 'success', text: `Sample ${statusModalSample.barcode} updated to ${selectedStatus}` });
      setStatusModalSample(null);
      setStatusRemarks('');
      setTimeout(() => setActionMessage(null), 4000);
      onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: `Update failed: ${err.message}` });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-sm font-medium flex items-center justify-between border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Analytics Row: 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Test Frequency BarChart (from Java HashMap) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Top Diagnostic Test Frequencies</h4>
              <p className="text-xs text-slate-500">Real-time hot lookup via Java HashMap</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              O(1) Hot Cache
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testFrequencies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val.toLocaleString()} samples`, 'Volume']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: In-House vs External Hub Donut Chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Lab Processing Distribution</h4>
              <p className="text-xs text-slate-500">In-House vs External Logistics</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Cutoff 13:00
            </span>
          </div>

          <div className="h-60 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={procSplitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {procSplitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => [`${value.toLocaleString()} (${item.payload.pct}%)`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-full grid grid-cols-2 gap-2 text-center text-xs mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-600 inline-block"></span>
                <span className="text-slate-600 font-medium">In-House ({dashboard.inHousePercentage}%)</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="text-slate-600 font-medium">Hub ({dashboard.externalHubPercentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Hourly Congestion Trend AreaChart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Hourly Sample Intake Trend</h4>
              <p className="text-xs text-slate-500">Morning rush & intake congestion velocity</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {dashboard.congestionVelocityPerHour} samples/hr
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} samples`, 'Registrations']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#intakeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main SLA Breach Triage Table powered by Java PriorityQueue Min-Heap */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Live SLA Breach Triage Queue
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                <Flame className="w-3 h-3 text-rose-600" />
                <span>Java PriorityQueue (Min-Heap)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Specimens actively prioritized by lowest dynamic SLA slack: <code className="text-teal-700 font-mono">slaSlack = (expected - now) - (0.5 * predictedTat)</code>
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
            <span>Showing top {triageNodes.length} critical samples</span>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Triage Rank</th>
                <th className="py-3 px-4">Barcode / Centre</th>
                <th className="py-3 px-4">Test Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Predicted TAT</th>
                <th className="py-3 px-4">Dynamic SLA Slack</th>
                <th className="py-3 px-4">Delay Risk</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {triageNodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">All Diagnostic Queues Clear</p>
                    <p className="text-xs text-slate-400">No pending specimens currently triaged in the Min-Heap.</p>
                  </td>
                </tr>
              ) : (
                triageNodes.map((node, idx) => {
                  const isBreached = node.slaSlackMinutes < 0;
                  const isUpdating = updatingId === node.sampleId;

                  let riskBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (node.riskLevel === 'HIGH') {
                    riskBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                  } else if (node.riskLevel === 'MEDIUM') {
                    riskBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
                  } else {
                    riskBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  }

                  return (
                    <tr
                      key={node.sampleId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        node.isStatUrgent ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Rank in Min-Heap */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #{idx + 1}
                        {idx === 0 && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-bold">
                            PEEK
                          </span>
                        )}
                      </td>

                      {/* Barcode & Centre */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{node.barcode}</span>
                          {node.isStatUrgent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                              STAT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{node.centreCode}</div>
                      </td>

                      {/* Test Code */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{node.testCode}</span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={node.testName}>
                          {node.testName}
                        </div>
                      </td>

                      {/* Processing Type */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            node.processingType === 'IN_HOUSE'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {node.processingType}
                        </span>
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {node.currentStatus}
                      </td>

                      {/* Predicted TAT */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {Math.round(node.predictedTatMinutes)} min
                        <div className="text-[10px] text-slate-400">XGBoost</div>
                      </td>

                      {/* Dynamic SLA Slack */}
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs ${
                            isBreached
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {Math.round(node.slaSlackMinutes)} min
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {isBreached ? 'Breach imminent/active' : 'Slack buffer'}
                        </div>
                      </td>

                      {/* Risk Level Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] border ${riskBadgeColor}`}>
                          {node.riskLevel} ({(node.delayProbability * 100).toFixed(0)}%)
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleQuickAdvance(node)}
                          disabled={isUpdating}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all disabled:opacity-50"
                          title="Advance to next workflow status"
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Advance</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setStatusModalSample(node);
                            setSelectedStatus('IN_HOUSE_PROCESSING');
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Modify
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modify Lifecycle Status Modal */}
      {statusModalSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Update Lifecycle Status
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sample Barcode: <span className="font-mono font-bold text-teal-700">{statusModalSample.barcode}</span> ({statusModalSample.testCode})
            </p>

            <form onSubmit={handleCustomStatusSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="ACCESSIONED">ACCESSIONED</option>
                  <option value="IN_HOUSE_PROCESSING">IN_HOUSE_PROCESSING</option>
                  <option value="DISPATCHED_TO_HUB">DISPATCHED_TO_HUB</option>
                  <option value="REPORT_GENERATED">REPORT_GENERATED (Completes TAT)</option>
                  <option value="DELIVERED">DELIVERED (Patient Sent)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Remarks
                </label>
                <textarea
                  rows={2}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Optional audit log remark for this transition..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalSample(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId !== null}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-50"
                >
                  Confirm Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
