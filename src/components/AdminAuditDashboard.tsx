import React, { useState, useEffect } from 'react';
import { runGlobalDataAudit, AuditReportItem } from '../utils/validation';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, Database, HelpCircle, Activity } from 'lucide-react';

export const AdminAuditDashboard: React.FC = () => {
  const [reports, setReports] = useState<AuditReportItem[]>([]);
  const [auditing, setAuditing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerAudit = async () => {
    setAuditing(true);
    setSuccessMessage(null);
    try {
      const results = await runGlobalDataAudit();
      setReports(results);
      setSuccessMessage('Data Integrity Audit completed successfully!');
    } catch (err) {
      console.error('Audit run failed:', err);
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    triggerAudit();
  }, []);

  const totalInspected = reports.length;
  const anomaliesCount = reports.filter((r) => r.hasMismatch).length;
  const healthyCount = totalInspected - anomaliesCount;
  const integrityScore = totalInspected > 0 ? Math.round((healthyCount / totalInspected) * 100) : 100;

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60" id="data-audit-dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            League Data Integrity Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time PL/pgSQL & Zod verification checking historical matches</p>
        </div>

        <button
          onClick={triggerAudit}
          disabled={auditing}
          className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`h-4 w-4 ${auditing ? 'animate-spin' : ''}`} />
          {auditing ? 'Running Diagnostic...' : 'Re-Run Verification'}
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl mb-6 font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inspected Matches</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalInspected}</span>
          </div>
          <Database className="h-8 w-8 text-slate-400 opacity-60" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Healthy Submissions</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{healthyCount}</span>
          </div>
          <CheckCircle className="h-8 w-8 text-emerald-400 opacity-60" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Detected Anomalies</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{anomaliesCount}</span>
          </div>
          <AlertTriangle className="h-8 w-8 text-rose-400 opacity-60" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Integrity Score</span>
            <span className={`text-2xl font-black mt-1 block ${integrityScore === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {integrityScore}%
            </span>
          </div>
          <Activity className="h-8 w-8 text-indigo-400 opacity-60" />
        </div>
      </div>

      {/* Audit Logs List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
          <span className="text-xs font-bold uppercase tracking-wide">Real-time Integrity Audit Log</span>
          <span className="bg-slate-800 text-[10px] px-2.5 py-1 rounded-full font-semibold border border-slate-700">
            Automated Serverless Scanning
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-10 text-center">
            <Database className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No active matches found or analyzed.</p>
            <p className="text-xs text-slate-400 mt-1">Submit completed match cards first to run data integrity checks.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
            {reports.map((report) => (
              <div key={report.matchId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {report.homeTeam} {report.homeScore} - {report.awayScore} {report.awayTeam}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded">
                      {report.matchDate}
                    </span>
                  </div>

                  <p className={`text-xs mt-1 font-semibold ${report.hasMismatch ? 'text-rose-600' : 'text-slate-500'}`}>
                    {report.mismatchDetails}
                  </p>
                </div>

                <div>
                  {report.hasMismatch ? (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Mismatched Goals
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Integrity Approved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
