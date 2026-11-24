import React, { useState } from 'react';
import {
  PackagePlus, CheckCircle, AlertTriangle, Clock,
  ArrowRight, ShieldCheck, Flame, RefreshCw, Cpu
} from 'lucide-react';
import { createSample } from '../services/api';

const TEST_OPTIONS = [
  { code: 'CBC', name: 'Complete Blood Count with ESR', type: 'IN_HOUSE', sla: 180, price: 350 },
  { code: 'HBA1C', name: 'Glycated Hemoglobin (HPLC)', type: 'IN_HOUSE', sla: 240, price: 600 },
  { code: 'LIPID', name: 'Lipid Profile Comprehensive', type: 'IN_HOUSE', sla: 240, price: 850 },
  { code: 'LFT', name: 'Liver Function Test', type: 'IN_HOUSE', sla: 240, price: 750 },
  { code: 'KFT', name: 'Kidney Function Test with Electrolytes', type: 'IN_HOUSE', sla: 240, price: 750 },
  { code: 'TFT', name: 'Thyroid Profile Total (T3, T4, TSH)', type: 'IN_HOUSE', sla: 360, price: 650 },
  { code: 'VITD', name: '25-Hydroxy Vitamin D (CLIA)', type: 'EXTERNAL_HUB', sla: 720, price: 1400 },
  { code: 'VITB12', name: 'Vitamin B12 Cyanocobalamin', type: 'EXTERNAL_HUB', sla: 720, price: 1100 },
  { code: 'FERRITIN', name: 'Serum Ferritin', type: 'EXTERNAL_HUB', sla: 720, price: 900 },
  { code: 'CULTURE', name: 'Urine Aerobic Culture (VITEK)', type: 'EXTERNAL_HUB', sla: 1440, price: 800 },
  { code: 'ANA', name: 'Antinuclear Antibodies (IFA)', type: 'EXTERNAL_HUB', sla: 1440, price: 1600 },
  { code: 'AMH', name: 'Anti-Mullerian Hormone Gen II', type: 'EXTERNAL_HUB', sla: 1440, price: 2200 },
];

const CENTRES = [
  { id: 1, code: 'DL-LP-01', name: 'Lajpat Nagar Collection Centre' },
  { id: 2, code: 'DL-LP-02', name: 'Saket Collection Centre' },
  { id: 3, code: 'DL-LP-03', name: 'Kalkaji Collection Centre' },
];

export default function SampleIntakeSimulatorTab({ onSampleCreated, onNavigateLive }) {
  const [centreId, setCentreId] = useState(1);
  const [testCode, setTestCode] = useState('CBC');
  const [isStatUrgent, setIsStatUrgent] = useState(false);
  const [customBarcode, setCustomBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const selectedTest = TEST_OPTIONS.find((t) => t.code === testCode) || TEST_OPTIONS[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        centreId: Number(centreId),
        testCode: testCode,
        isStatUrgent: isStatUrgent,
        barcode: customBarcode.trim() || undefined,
      };

      const response = await createSample(payload);
      setResult(response);
      if (onSampleCreated) onSampleCreated();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register sample');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Form: Phlebotomy Intake Console */}
      <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
            <PackagePlus className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Diagnostic Specimen Intake Console
            </h3>
            <p className="text-xs text-slate-500">
              Registration, barcode issuance, and real-time turnaround time estimation
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Collection Centre */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Collection Franchise Centre
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {CENTRES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCentreId(c.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    centreId === c.id
                      ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="font-mono text-xs font-bold text-slate-900">{c.code}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.name.split(' ')[0]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostic Test Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Diagnostic Test Order
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                Standard SLA: <span className="font-mono text-teal-700 font-bold">{selectedTest.sla} min</span>
              </span>
            </div>

            <select
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              {TEST_OPTIONS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.name} ({t.type === 'IN_HOUSE' ? 'In-House Testing' : 'External Hub'}, ₹{t.price})
                </option>
              ))}
            </select>
          </div>

          {/* Logistics Metadata */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500">Testing Route: </span>
              <span className="font-bold text-slate-800">
                {selectedTest.type === 'IN_HOUSE' ? 'In-House Analyzer' : 'Regional Hub Logistics'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Logistics Cutoff: </span>
              <span className="font-bold text-slate-800 font-mono">13:00 (1:00 PM)</span>
            </div>
          </div>

          {/* STAT Emergency Flag */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isStatUrgent ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                <Flame className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">STAT Emergency Specimen</p>
                <p className="text-[11px] text-slate-500">
                  Flags specimen for immediate STAT priority dispatch across analyzer queues.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isStatUrgent}
                onChange={(e) => setIsStatUrgent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Optional Custom Barcode */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Custom Barcode (Optional)
            </label>
            <input
              type="text"
              value={customBarcode}
              onChange={(e) => setCustomBarcode(e.target.value)}
              placeholder="Leave blank to auto-generate: LPL-DL-LP-01-YYMMDD-XXXXX"
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Intake & Turnaround Assessment...</span>
              </>
            ) : (
              <>
                <span>Register & Ingest Specimen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Live AI Prediction Result */}
      <div className="lg:col-span-5 space-y-4">
        {result ? (
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden animate-in fade-in duration-200">
            <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">Specimen Ingested Successfully</h4>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                ID #{result.sampleId}
              </span>
            </div>

            {/* Barcode Display */}
            <div className="mt-4 p-3.5 bg-slate-900 text-white rounded-xl text-center shadow-xs">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Specimen Tube Barcode</p>
              <p className="font-mono text-base font-bold tracking-wider text-teal-400 mt-0.5">
                {result.barcode}
              </p>
            </div>

            {/* Predictive Output Card */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Standard Test SLA:</span>
                <span className="font-mono font-bold text-slate-900">{result.standardSlaMinutes} minutes</span>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-teal-50 border border-teal-200">
                <span className="text-teal-900 font-semibold flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-teal-700" />
                  <span>Estimated Turnaround Time:</span>
                </span>
                <span className="font-mono font-black text-teal-950 text-sm">
                  {Math.round(result.predictedTatMinutes || 0)} min
                </span>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Delay Breach Probability:</span>
                <span className="font-mono font-bold text-slate-900">
                  {((result.delayProbability || 0) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Clinical Urgency Category:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] whitespace-nowrap ${
                    result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH'
                      ? 'bg-rose-100 text-rose-800'
                      : result.riskLevel === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {result.riskLevel}
                </span>
              </div>
            </div>

            {/* Navigation CTA */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={onNavigateLive}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200"
              >
                <span>View in Live Triage Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-xs text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">Awaiting Specimen Registration</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Select franchise parameters on the left and submit to assess turnaround estimates and queue priority.
            </p>
          </div>
        )}

        {/* Informational Domain Callout */}
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs text-xs space-y-2.5 border border-slate-800">
          <p className="font-bold text-teal-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Franchise Operational Protocol</span>
          </p>
          <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Samples registered before 10:30 AM account for fasting rush queue congestion.</li>
            <li>External hub samples collected after 1:00 PM (13:00) automatically reflect overnight courier hold.</li>
            <li>STAT specimens bypass routine queues and are dispatched with immediate clinical priority.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
