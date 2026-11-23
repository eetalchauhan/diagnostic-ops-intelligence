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

  // Auto-refresh polling every 15 seconds when viewing Live tab
  useEffect(() => {
    if (activeTab !== 'live') return;

    const intervalId = setInterval(() => {
      loadDashboardData(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [activeTab, loadDashboardData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation & Live Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRefreshing={isRefreshing}
        onRefresh={() => loadDashboardData(false)}
        lastUpdated={lastUpdated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Backend Connection Error: {error}. Ensure Spring Boot backend is active on <code className="font-mono">{API_BASE_URL}</code>.
              </span>
            </div>
            <button
              onClick={() => loadDashboardData(false)}
              className="px-2.5 py-1 rounded-md bg-rose-200 hover:bg-rose-300 font-bold transition-colors"
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
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Connecting to Diagnostic Ops Engine...</p>
            <p className="text-xs text-slate-400">Hydrating PriorityQueue Min-Heap and Sliding Window</p>
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
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Dr Lal PathLabs Franchise Analytics</span>
            <span>•</span>
            <span>Delhi-NCR Network (DL-LP-01, DL-LP-02, DL-LP-03)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span>Spring Boot 3.2</span>
            <span>•</span>
            <span>XGBoost ML v1.0</span>
            <span>•</span>
            <span>Min-Heap PriorityQueue</span>
            <span>•</span>
            <span>ArrayDeque Sliding Window</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
