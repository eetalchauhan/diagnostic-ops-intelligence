import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Sparkles, TrendingUp, Building2, Layers, Calendar,
  BarChart2, Award, Info, RefreshCw, CheckCircle2
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
    date: f.forecast_date,
    predicted: f.predicted_volume,
    lower: f.lower_bound,
    upper: f.upper_bound,
    range: [f.lower_bound, f.upper_bound],
  }));

  const metrics = forecastData?.modelMetrics || [];

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
            7-day forward volume projections with day-of-week trends and 95% confidence intervals
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

      {/* Model Benchmark Table for Clinical Governance */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Predictive Model Governance & Calibration Benchmark
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audited Accuracy</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Clinical validation and error calibration metrics for turnaround time and test demand models
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Validation Task</th>
                <th className="py-3 px-4">Model Engine</th>
                <th className="py-3 px-4">Mean Abs Error (MAE)</th>
                <th className="py-3 px-4">RMSE</th>
                <th className="py-3 px-4">MAPE</th>
                <th className="py-3 px-4">Accuracy / R²</th>
                <th className="py-3 px-4">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No benchmark evaluation records found in database.
                  </td>
                </tr>
              ) : (
                metrics.map((m) => {
                  const isChampion = m.modelName.toLowerCase().includes('xgboost');
                  return (
                    <tr key={m.metricId} className={isChampion ? 'bg-teal-50/20' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {m.taskName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-1.5">
                        <span>{m.modelName}</span>
                        {isChampion && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white">
                            Active Champion
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">{m.mae > 0 ? `${m.mae.toFixed(2)}` : '—'}</td>
                      <td className="py-3 px-4 font-mono">{m.rmse > 0 ? `${m.rmse.toFixed(2)}` : '—'}</td>
                      <td className="py-3 px-4 font-mono">{m.mape > 0 ? `${m.mape.toFixed(2)}%` : '—'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {m.r2OrF1.toFixed(4)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isChampion
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isChampion ? 'Active Serving Engine' : 'Validated Baseline'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
