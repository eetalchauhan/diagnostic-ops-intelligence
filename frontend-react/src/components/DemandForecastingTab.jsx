import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Sparkles, TrendingUp, Building2, Layers, Calendar,
  BarChart2, Award, Info, RefreshCw
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
      setError(err.message || 'Failed to retrieve AI demand forecast');
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
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              AI-Powered Diagnostic Demand Forecasting
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>XGBoost Multi-Series Regressor</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Autoregressive projections with lag features (<code className="text-teal-700">lag_1, lag_7, rolling_7d_mean</code>) and calendar variations.
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
              className="bg-transparent focus:outline-none cursor-pointer"
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
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In-House
            </button>
            <button
              onClick={() => setProcessingType('EXTERNAL_HUB')}
              className={`px-3 py-1 rounded-md transition-all ${
                processingType === 'EXTERNAL_HUB'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              External Hub
            </button>
          </div>

          {/* Horizon Select */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={7}>7 Days Ahead</option>
              <option value={14}>14 Days Ahead</option>
              <option value={21}>21 Days Ahead</option>
            </select>
          </div>

          <button
            onClick={loadForecasts}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
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

      {/* Main Forecast Chart with Confidence Bands */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {horizonDays}-Day Projected Sample Volume & 90% Confidence Interval
            </h4>
            <p className="text-xs text-slate-500">
              Centre: <span className="font-semibold text-slate-700">{CENTRES.find((c) => c.id === centreId)?.name}</span> ({processingType})
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-blue-600 inline-block"></span>
              <span>Point Forecast</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-blue-100 rounded inline-block"></span>
              <span>90% Confidence Band</span>
            </span>
          </div>
        </div>

        <div className="h-72">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'predicted') return [`${value} samples`, 'Expected Demand'];
                    if (name === 'upper') return [`${value} samples`, 'Upper Bound (90%)'];
                    if (name === 'lower') return [`${value} samples`, 'Lower Bound (90%)'];
                    return [value, name];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="upper" stroke="#93c5fd" strokeDasharray="3 3" fill="url(#bandGrad)" />
                <Area type="monotone" dataKey="lower" stroke="#93c5fd" strokeDasharray="3 3" fill="#ffffff" />
                <Line type="monotone" dataKey="predicted" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model Benchmark Table for Research Paper & Governance */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Machine Learning Model Evaluation Benchmark (Paper Artifact)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <Award className="w-3 h-3 text-emerald-600" />
                <span>Audited Metrics</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Benchmark comparison recorded in PostgreSQL table <code className="text-teal-700">ml_model_metrics</code> across Linear Regression, Random Forest, and XGBoost.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">ML Task</th>
                <th className="py-3 px-4">Model Architecture</th>
                <th className="py-3 px-4">MAE</th>
                <th className="py-3 px-4">RMSE</th>
                <th className="py-3 px-4">MAPE</th>
                <th className="py-3 px-4">R² / Weighted F1</th>
                <th className="py-3 px-4">Deployment Status</th>
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
                  const isXGB = m.modelName.toLowerCase().includes('xgboost');
                  return (
                    <tr key={m.metricId} className={isXGB ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {m.taskName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-1.5">
                        <span>{m.modelName}</span>
                        {isXGB && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
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
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isXGB
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isXGB ? 'Production Serving' : 'Benchmark Baseline'}
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
