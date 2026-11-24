import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import LiveOperationsTab from './components/LiveOperationsTab';
import DemandForecastingTab from './components/DemandForecastingTab';
import SampleIntakeSimulatorTab from './components/SampleIntakeSimulatorTab';
import DispatchSimulationTab from './components/DispatchSimulationTab';
import { fetchDashboard, API_BASE_URL } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  const loadDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await fetchDashboard();
      setDashboard(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(
        err.message || `Unable to connect to Core Backend on ${API_BASE_URL}`
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Live Auto-Sync polling every 30 seconds when enabled and on Live view
  useEffect(() => {
    if (activeTab !== 'live' || !autoSync) return;

    const intervalId = setInterval(() => {
      loadDashboardData(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeTab, autoSync, loadDashboardData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Top Subtle Gradient Accents */}
      <div className="h-1 bg-gradient-to-r from-teal-600 via-indigo-600 to-teal-500 w-full" />

      {/* Top Navigation & Live Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRefreshing={isRefreshing}
        onRefresh={() => loadDashboardData(false)}
        lastUpdated={lastUpdated}
        autoSync={autoSync}
        setAutoSync={setAutoSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Backend Connection Error: {error}. Ensure Spring Boot backend is active on <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">{API_BASE_URL}</code>.
              </span>
            </div>
            <button
              onClick={() => loadDashboardData(false)}
              className="px-3 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Global KPI Cards (Shown on Live and Dispatch views) */}
        {(activeTab === 'live' || activeTab === 'dispatch') && (
          <KpiCards dashboard={dashboard} />
        )}

        {/* Dynamic Tab Views */}
        {loading && !dashboard ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="p-4 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-sm font-bold text-slate-800">Connecting to Diagnostic Operations Center...</p>
            <p className="text-xs text-slate-400">Synchronizing live specimen tracking and turnaround queues</p>
          </div>
        ) : (
          <>
            {activeTab === 'live' && (
              <LiveOperationsTab
                dashboard={dashboard}
                onRefresh={() => loadDashboardData(true)}
              />
            )}

            {activeTab === 'forecast' && (
              <DemandForecastingTab />
            )}

            {activeTab === 'intake' && (
              <SampleIntakeSimulatorTab
                onSampleCreated={() => loadDashboardData(true)}
                onNavigateLive={() => setActiveTab('live')}
              />
            )}

            {activeTab === 'dispatch' && (
              <DispatchSimulationTab />
            )}
          </>
        )}
      </main>

      {/* Clinical Platform Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Dr Lal PathLabs Diagnostic Intelligence</span>
            <span>•</span>
            <span>Delhi-NCR Network (DL-LP-01, DL-LP-02, DL-LP-03)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-400">
            <span>Clinical Operations Center</span>
            <span>•</span>
            <span>Real-Time Dynamic Triage</span>
            <span>•</span>
            <span>Predictive Turnaround Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
