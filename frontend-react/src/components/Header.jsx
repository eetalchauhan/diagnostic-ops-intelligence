import React from 'react';
import { Activity, Clock, ShieldAlert, Cpu, Sparkles, RefreshCw } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  isRefreshing,
  onRefresh,
  lastUpdated,
  autoSync = true,
  setAutoSync,
}) {
  const tabs = [
    { id: 'live', label: 'Live Operations & SLA Triage', icon: ShieldAlert },
    { id: 'forecast', label: 'AI Demand & Volume Trends', icon: Sparkles },
    { id: 'intake', label: 'New Specimen Intake', icon: Activity },
    { id: 'dispatch', label: 'Lab Dispatch Optimizer', icon: Cpu },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-slate-900">Dr Lal PathLabs</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/80">
                  Diagnostic Ops
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Clinical Laboratory Operations & SLA Dispatch Center
              </p>
            </div>
          </div>

          {/* Right Action & Live Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Live Operations & AI Status Pill */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-900">Live Operations & AI Active</span>
            </div>

            {/* Live Auto-Sync (30s) Toggle Switch */}
            {setAutoSync && (
              <button
                type="button"
                onClick={() => setAutoSync(!autoSync)}
                className={`hidden sm:flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  autoSync
                    ? 'bg-teal-50/80 text-teal-800 border-teal-200 hover:bg-teal-100/70'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
                title={autoSync ? 'Live auto-refresh every 30s enabled' : 'Auto-refresh paused'}
              >
                <span className="relative flex h-2 w-2">
                  {autoSync ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                  )}
                </span>
                <span>Auto-Sync {autoSync ? '(30s)' : '(Off)'}</span>
              </button>
            )}

            {lastUpdated && (
              <div className="hidden lg:flex items-center space-x-1 text-xs text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors disabled:opacity-60 shadow-xs"
              title="Refresh Live Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto border-t border-slate-100 py-1.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
