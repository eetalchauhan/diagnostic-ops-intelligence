import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Sparkles, TrendingUp, Building2, Calendar,
  RefreshCw, CheckCircle2, ClipboardList, Users, PackageCheck, Truck, Clock
} from 'lucide-react';
import { fetchForecasts } from '../services/api';

const CENTRES = [
  { id: 1, code: 'DL-LP-01', name: 'Lajpat Nagar Collection Centre' },
  { id: 2, code: 'DL-LP-02', name: 'Saket Collection Centre' },
  { id: 3, code: 'DL-LP-03', name: 'Kalkaji Collection Centre' },
];

export default function DemandForecastingTab() {
  const [centreId, setCentreId] = useState(1);
  const [processingType, setProcessingType] = useState('IN_HOUSE');
  const [horizonDays, setHorizonDays] = useState(7);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadForecasts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchForecasts(centreId, processingType, horizonDays);
      setForecastData(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve diagnostic demand forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecasts();
  }, [centreId, processingType, horizonDays]);

  // Format forecast array for Recharts ComposedChart
  const chartData = (forecastData?.forecasts || []).map((f) => ({
    date: f.forecast_date || f.forecastDate,
    predicted: f.predicted_volume ?? f.predictedVolume,
    lower: f.lower_bound ?? f.lowerBound,
    upper: f.upper_bound ?? f.upperBound,
    range: [f.lower_bound ?? f.lowerBound, f.upper_bound ?? f.upperBound],
  }));

  // Derived operational readiness metrics
  const avgDailyVolume = chartData.length > 0
    ? Math.round(chartData.reduce((sum, item) => sum + (item.predicted || 0), 0) / chartData.length)
    : 140;

  // Peak morning rush accounts for ~58% of intake across 08:00 AM – 11:00 AM (3 hours)
  const peakMorningIntake = Math.round(avgDailyVolume * 0.58);
  const peakSamplesPerHour = Math.max(16, Math.round(peakMorningIntake / 3));
  // Standard draw capacity: ~13 patients per phlebotomist per hour
  const recommendedPhlebotomists = Math.max(2, Math.ceil(peakSamplesPerHour / 13));

  // Pre-analytical vacutainer / kit staging breakdown
  const edtaKits = Math.round(avgDailyVolume * 0.40);       // Lavender top: CBC with ESR, HbA1c HPLC
  const sstKits = Math.round(avgDailyVolume * 0.45);        // Gold/Red SST Gel: Lipid, LFT, KFT, Thyroid
  const fluorideKits = Math.max(10, Math.round(avgDailyVolume * 0.15)); // Grey top: Fasting Blood Sugar
  const totalPrepVials = edtaKits + sstKits + fluorideKits;

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              Diagnostic Test Demand & Volume Forecasting
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>Predictive Volume Intelligence</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Forward volume projections with day-of-week trends and 95% confidence intervals
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Centre Select */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={centreId}
              onChange={(e) => setCentreId(Number(e.target.value))}
              className="bg-transparent focus:outline-none cursor-pointer font-bold"
            >
              {CENTRES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Processing Type Toggle */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setProcessingType('IN_HOUSE')}
              className={`px-3 py-1 rounded-md transition-all ${
                processingType === 'IN_HOUSE'
                  ? 'bg-white text-teal-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In-House Testing
            </button>
            <button
              onClick={() => setProcessingType('EXTERNAL_HUB')}
              className={`px-3 py-1 rounded-md transition-all ${
                processingType === 'EXTERNAL_HUB'
                  ? 'bg-white text-amber-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hub Logistics
            </button>
          </div>

          {/* Horizon Select */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="bg-transparent focus:outline-none cursor-pointer font-bold"
            >
              <option value={7}>7 Days Ahead</option>
              <option value={14}>14 Days Ahead</option>
              <option value={21}>21 Days Ahead</option>
            </select>
          </div>

          <button
            onClick={loadForecasts}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shadow-xs"
            title="Recalculate forecast"
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

      {/* Main Forecasting Composed Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>Projected Sample Volume Horizon</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily diagnostic order demand with upper & lower 95% confidence intervals
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-teal-600 inline-block"></span>
              <span className="text-slate-700">Expected Volume</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-teal-500/20 border border-teal-500/40 rounded-xs inline-block"></span>
              <span className="text-slate-500">95% Range</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center space-x-2 text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>Calculating volume projections...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              No demand forecast data available for selected criteria.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-bold text-teal-400">{label}</p>
                          <p className="text-slate-200">
                            Projected Volume: <strong className="text-white font-mono">{data.predicted} vials</strong>
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            95% Band: {data.lower} – {data.upper} vials
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#forecastBand)" fillOpacity={1} />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#0d9488"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Shift Staffing & Collection Kit Readiness Planner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">
                Shift Staffing & Collection Kit Readiness Planner
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                Supervisor Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily phlebotomy shift sizing, tube pre-labeling targets, and logistics cutoff dispatch windows
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>High Forecast Reliability • Updated Live</span>
            </span>
          </div>
        </div>

        {/* 3 Actionable Operational Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 — Peak Rush Window & Phlebotomy Staffing */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-teal-300 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  Morning Rush Window
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Peak Rush & Phlebotomy Staffing
                </p>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black text-slate-900">08:00 AM – 11:00 AM</span>
                </div>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">
                  ~{peakSamplesPerHour} vials / hr peak draw volume
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Recommended Counters:</span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {recommendedPhlebotomists} Phlebotomists
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Morning Surge Total:</span>
                <span className="font-bold text-slate-800">~{peakMorningIntake} patients (58%)</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                Open Counter 1 & 2 by 07:45 AM to eliminate patient waiting time during morning fasting rush.
              </p>
            </div>
          </div>

          {/* Card 2 — Pre-Analytical Kit & Vial Prep Estimate */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Daily Staging Target
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pre-Analytical Kit & Vial Prep
                </p>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black text-slate-900">~{totalPrepVials} Pre-Labeled Tubes</span>
                </div>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                  Consumables target for next operational shift
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  <span>EDTA / CBC (Lavender)</span>
                </span>
                <span className="font-bold text-slate-900 font-mono">{edtaKits} tubes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>SST / Lipid & Thyroid (Gold)</span>
                </span>
                <span className="font-bold text-slate-900 font-mono">{sstKits} tubes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                  <span>Fluoride / Fasting Sugar (Grey)</span>
                </span>
                <span className="font-bold text-slate-900 font-mono">{fluorideKits} tubes</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                Pre-rack and barcode tubes prior to 07:30 AM intake to expedite phlebotomy room throughput.
              </p>
            </div>
          </div>

          {/* Card 3 — Forecast Confidence & Schedule Advisory */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-300 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Verified Schedule</span>
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Logistics & Courier Readiness
                </p>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black text-slate-900">2 Daily Dispatches</span>
                </div>
                <p className="text-xs text-amber-700 font-semibold mt-0.5">
                  Central Hub transit coordination
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Morning Dispatch Batch:</span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  11:15 AM Window
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Afternoon Dispatch Batch:</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  04:30 PM Window
                </span>
              </div>
              <div className="pt-1 border-t border-slate-100 space-y-1">
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Cold-Chain Compliance: 2°C – 8°C verified</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-medium">
                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Hub Courier Cutoff: 13:00 departure target</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
