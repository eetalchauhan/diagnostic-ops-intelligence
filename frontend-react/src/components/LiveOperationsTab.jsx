import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  CheckCircle2, Flame, ChevronRight, RefreshCw, Search,
  Filter, X, Clock, AlertTriangle, ShieldAlert, FileText,
  Truck, ArrowUpRight, Check, Eye
} from 'lucide-react';
import { updateSampleStatus } from '../services/api';

const DONUT_COLORS = ['#0d9488', '#f59e0b']; // In-House (Teal), External Hub (Amber)

const LIFECYCLE_STAGES = [
  { key: 'COLLECTED', label: '1. Drawn & Barcoded', desc: 'Phlebotomy station' },
  { key: 'ACCESSIONED', label: '2. Accessioned', desc: 'Centrifuged & verified' },
  { key: 'PROCESSING', label: '3. Lab / Logistics', desc: 'Analyzer or Hub dispatch' },
  { key: 'REPORT_GENERATED', label: '4. Verified', desc: 'Pathologist validated' },
  { key: 'DELIVERED', label: '5. Dispatched', desc: 'Patient SMS/WhatsApp' },
];

export default function LiveOperationsTab({ dashboard, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [inspectingSample, setInspectingSample] = useState(null);
  const [statusModalSample, setStatusModalSample] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('ACCESSIONED');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, CRITICAL, IN_HOUSE, EXTERNAL_HUB, STAT
  const [selectedTestFilter, setSelectedTestFilter] = useState(null);

  if (!dashboard) return null;

  // 1. Prepare Top Test Code Frequency Data for BarChart
  const testFrequencies = Object.entries(dashboard.topTestFrequencies || {}).map(([code, count]) => ({
    name: code,
    count: count,
  })).slice(0, 8);

  // 2. Prepare Donut Chart Data (In-House vs External Hub)
  const procSplitData = [
    { name: 'In-House Testing', value: dashboard.inHouseCount || 0, pct: dashboard.inHousePercentage || 0 },
    { name: 'External Hub Logistics', value: dashboard.externalHubCount || 0, pct: dashboard.externalHubPercentage || 0 },
  ];

  // 3. Prepare Hourly Congestion Data
  const hourlyData = (dashboard.hourlyIntakeDistribution || []).map((item) => ({
    hourLabel: `${String(item.hour).padStart(2, '0')}:00`,
    volume: item.volume,
  }));

  // 4. Raw pending specimens
  const rawTriageNodes = dashboard.topAtRiskSamples || [];

  // Filtered samples based on search and quick filters
  const filteredTriageNodes = useMemo(() => {
    return rawTriageNodes.filter((node) => {
      // Test code filter from chart click
      if (selectedTestFilter && node.testCode.toUpperCase() !== selectedTestFilter.toUpperCase()) {
        return false;
      }

      // Quick category filter
      if (statusFilter === 'CRITICAL' && node.slaSlackMinutes > 0) {
        return false;
      }
      if (statusFilter === 'IN_HOUSE' && node.processingType !== 'IN_HOUSE') {
        return false;
      }
      if (statusFilter === 'EXTERNAL_HUB' && node.processingType !== 'EXTERNAL_HUB') {
        return false;
      }
      if (statusFilter === 'STAT' && !node.isStatUrgent) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchBarcode = node.barcode?.toLowerCase().includes(query);
        const matchTestCode = node.testCode?.toLowerCase().includes(query);
        const matchTestName = node.testName?.toLowerCase().includes(query);
        const matchCentre = node.centreCode?.toLowerCase().includes(query);
        if (!matchBarcode && !matchTestCode && !matchTestName && !matchCentre) {
          return false;
        }
      }

      return true;
    });
  }, [rawTriageNodes, searchQuery, statusFilter, selectedTestFilter]);

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
      await updateSampleStatus(sample.sampleId, nextStatus, `Advanced to ${nextStatus} via Live Triage Console`);
      setActionMessage({ type: 'success', text: `Vial ${sample.barcode} advanced to ${nextStatus}` });
      setTimeout(() => setActionMessage(null), 4000);
      onRefresh();
      // Keep inspector updated if open
      if (inspectingSample && inspectingSample.sampleId === sample.sampleId) {
        setInspectingSample({ ...inspectingSample, currentStatus: nextStatus });
      }
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
      setActionMessage({ type: 'success', text: `Vial ${statusModalSample.barcode} updated to ${selectedStatus}` });
      setStatusModalSample(null);
      setStatusRemarks('');
      setTimeout(() => setActionMessage(null), 4000);
      onRefresh();
      if (inspectingSample && inspectingSample.sampleId === statusModalSample.sampleId) {
        setInspectingSample({ ...inspectingSample, currentStatus: selectedStatus });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Update failed: ${err.message}` });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper to determine stage state in inspector
  const getStageState = (sample, stageIndex) => {
    const status = sample.currentStatus;
    const stageMap = {
      'COLLECTED': 0,
      'ACCESSIONED': 1,
      'IN_HOUSE_PROCESSING': 2,
      'DISPATCHED_TO_HUB': 2,
      'REPORT_GENERATED': 3,
      'DELIVERED': 4
    };
    const currentIdx = stageMap[status] ?? 0;
    if (stageIndex < currentIdx) return 'completed';
    if (stageIndex === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Analytics Row: 3 Elevated Glass Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Test Frequency BarChart (Clickable to Filter) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Top Diagnostic Test Frequencies</h4>
              <p className="text-xs text-slate-500">Most requested pathology panels</p>
            </div>
            {selectedTestFilter ? (
              <button
                onClick={() => setSelectedTestFilter(null)}
                className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors"
                title="Clear test filter"
              >
                <span>{selectedTestFilter}</span>
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">
                Click bar to filter
              </span>
            )}
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={testFrequencies}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const code = e.activePayload[0].payload.name;
                    setSelectedTestFilter(code === selectedTestFilter ? null : code);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val.toLocaleString()} samples`, 'Intake Volume']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar
                  dataKey="count"
                  fill="#0d9488"
                  radius={[5, 5, 0, 0]}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: In-House vs External Hub Donut Chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Lab Processing Distribution</h4>
              <p className="text-xs text-slate-500">In-House vs Regional Hub Logistics</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
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
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-full grid grid-cols-2 gap-2 text-center text-xs mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-600 inline-block"></span>
                <span className="text-slate-700 font-semibold">In-House ({dashboard.inHousePercentage}%)</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="text-slate-700 font-semibold">Hub Transit ({dashboard.externalHubPercentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Hourly Congestion Trend AreaChart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Hourly Sample Intake Trend</h4>
              <p className="text-xs text-slate-500">Morning fasting rush & intake velocity</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {dashboard.congestionVelocityPerHour} vials/hr
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} samples`, 'Registrations']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#intakeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main SLA Breach Triage Console */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header & Clinical Urgency Notice */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Live SLA Breach Triage Queue
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-teal-700" />
                <span>Priority Dispatched</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ranked by urgency, clinical priority, and remaining turnaround window
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              Showing {filteredTriageNodes.length} of {rawTriageNodes.length} active vials
            </span>
          </div>
        </div>

        {/* Live Search and Quick Filter Bar */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search barcode, test code (e.g. CBC), centre (DL-LP-01)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: 'ALL', label: 'All Vials' },
              { id: 'CRITICAL', label: 'Critical / Breached' },
              { id: 'STAT', label: 'STAT Urgent' },
              { id: 'IN_HOUSE', label: 'In-House' },
              { id: 'EXTERNAL_HUB', label: 'Hub Dispatch' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === f.id
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}

            {selectedTestFilter && (
              <span className="flex items-center space-x-1 pl-2 text-teal-800 text-xs font-bold">
                <span>Filter: {selectedTestFilter}</span>
                <button onClick={() => setSelectedTestFilter(null)} className="hover:text-teal-950">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Triage Rank</th>
                <th className="py-3 px-4">Barcode / Centre</th>
                <th className="py-3 px-4">Pathology Test</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Workflow Status</th>
                <th className="py-3 px-4">Turnaround (Est.)</th>
                <th className="py-3 px-4">Remaining SLA Slack</th>
                <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Delay Risk</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredTriageNodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No Matching Specimens Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || statusFilter !== 'ALL' || selectedTestFilter
                        ? 'Try clearing active search or filters to see all queued vials.'
                        : 'No pending specimens currently triaged in queue.'}
                    </p>
                    {(searchQuery || statusFilter !== 'ALL' || selectedTestFilter) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                          setSelectedTestFilter(null);
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs transition-colors"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTriageNodes.map((node, idx) => {
                  const isBreached = node.slaSlackMinutes <= 0;
                  const isNearBreach = node.slaSlackMinutes > 0 && node.slaSlackMinutes <= 30;
                  const isUpdating = updatingId === node.sampleId;

                  // Dynamic risk badge calculation aligned with slack
                  let displayRiskLevel = node.riskLevel;
                  let displayProbability = node.delayProbability;
                  let riskBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

                  if (node.slaSlackMinutes <= 0) {
                    displayRiskLevel = 'CRITICAL';
                    displayProbability = 1.0;
                    riskBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                  } else if (node.slaSlackMinutes <= 30 || node.riskLevel === 'HIGH') {
                    displayRiskLevel = 'HIGH';
                    displayProbability = Math.max(displayProbability || 0, 0.85);
                    riskBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
                  } else if (node.riskLevel === 'MEDIUM') {
                    riskBadgeColor = 'bg-amber-50 text-amber-600 border-amber-200 font-medium';
                  } else {
                    riskBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  }

                  return (
                    <tr
                      key={node.sampleId}
                      onClick={() => setInspectingSample(node)}
                      className={`hover:bg-teal-50/40 cursor-pointer transition-colors ${
                        node.isStatUrgent ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Triage Rank */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                        #{idx + 1}
                        {idx === 0 && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider">
                            NEXT UP
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

                      {/* Pathology Test */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{node.testCode}</span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={node.testName}>
                          {node.testName}
                        </div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            node.processingType === 'IN_HOUSE'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {node.processingType === 'IN_HOUSE' ? 'In-House' : 'Hub Logistics'}
                        </span>
                      </td>

                      {/* Workflow Status */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {node.currentStatus}
                        </span>
                      </td>

                      {/* Estimated Turnaround */}
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        {Math.round(node.predictedTatMinutes)} min
                        <div className="text-[10px] text-slate-400 font-sans">Est. turnaround</div>
                      </td>

                      {/* Dynamic SLA Slack */}
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs ${
                            isBreached
                              ? 'bg-rose-100 text-rose-800'
                              : isNearBreach
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {Math.round(node.slaSlackMinutes)} min
                        </span>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {isBreached ? 'Past SLA Target' : isNearBreach ? 'Near Breach (<30m)' : 'Buffer Slack'}
                        </div>
                      </td>

                      {/* Delay Risk Badge (Non-wrapping, aligned with slack) */}
                      <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                        <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskBadgeColor}`}>
                          {displayRiskLevel} ({(displayProbability * 100).toFixed(0)}%)
                        </span>
                      </td>

                      {/* Quick Action Button */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleQuickAdvance(node)}
                          disabled={isUpdating}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all disabled:opacity-50"
                          title="Advance to next workflow stage"
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
                          onClick={() => setInspectingSample(node)}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Inspect Specimen Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Interactive Sample Inspector Slide-over Drawer / Modal */}
      {inspectingSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-slate-900/40 backdrop-blur-xs p-4 sm:p-0">
          <div className="bg-white w-full sm:max-w-lg h-full sm:h-auto sm:min-h-screen shadow-2xl border-l border-slate-200 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Specimen Inspector</span>
                  {inspectingSample.isStatUrgent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                      STAT
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-mono font-bold text-white mt-1">
                  {inspectingSample.barcode}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centre: <span className="font-semibold text-slate-200">{inspectingSample.centreCode}</span> • ID #{inspectingSample.sampleId}
                </p>
              </div>
              <button
                onClick={() => setInspectingSample(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Test Information */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-slate-400">Pathology Test</p>
                    <h4 className="text-base font-bold text-slate-900">
                      {inspectingSample.testName} ({inspectingSample.testCode})
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      inspectingSample.processingType === 'IN_HOUSE'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {inspectingSample.processingType === 'IN_HOUSE' ? 'In-House Testing' : 'Hub Logistics'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200">
                  <span>Department: <strong>{inspectingSample.department || 'Clinical Pathology'}</strong></span>
                  <span>Standard SLA: <strong>{inspectingSample.standardSlaMinutes || 180} min</strong></span>
                </div>
              </div>

              {/* Turnaround & SLA Slack Bar */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Turnaround Performance</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    inspectingSample.slaSlackMinutes <= 0
                      ? 'bg-rose-100 text-rose-800'
                      : inspectingSample.slaSlackMinutes <= 30
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {Math.round(inspectingSample.slaSlackMinutes)} min slack
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated TAT</p>
                    <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                      {Math.round(inspectingSample.predictedTatMinutes)} min
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Delay Risk Assessment</p>
                    <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                      {inspectingSample.slaSlackMinutes <= 0 ? 'CRITICAL (100%)' : `${inspectingSample.riskLevel} (${(inspectingSample.delayProbability * 100).toFixed(0)}%)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 5-Stage Specimen Lifecycle Tracker */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Specimen Lifecycle Progress
                </h4>

                <div className="space-y-2">
                  {LIFECYCLE_STAGES.map((stage, idx) => {
                    const state = getStageState(inspectingSample, idx);
                    return (
                      <div
                        key={stage.key}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          state === 'active'
                            ? 'bg-teal-50/80 border-teal-300 shadow-xs'
                            : state === 'completed'
                            ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                            : 'bg-slate-50/50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              state === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : state === 'active'
                                ? 'bg-teal-600 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {state === 'completed' ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${state === 'active' ? 'text-teal-900' : 'text-slate-900'}`}>
                              {stage.label}
                            </p>
                            <p className="text-[11px] text-slate-500">{stage.desc}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-slate-200">
                          {state === 'completed' ? 'Done' : state === 'active' ? 'Current' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons in Drawer */}
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleQuickAdvance(inspectingSample)}
                  disabled={updatingId === inspectingSample.sampleId}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
                >
                  {updatingId === inspectingSample.sampleId ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Advance to Next Workflow Stage</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setStatusModalSample(inspectingSample);
                    setSelectedStatus('IN_HOUSE_PROCESSING');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Manual Status Override & Audit Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modify Lifecycle Status Modal */}
      {statusModalSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Update Specimen Lifecycle Status
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
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Centrifuged at 3000 RPM, verified for hemolysis"
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalSample(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === statusModalSample.sampleId}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
                >
                  {updatingId === statusModalSample.sampleId ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
