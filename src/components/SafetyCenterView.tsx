import React, { useState } from 'react';
import { ViewType, SafetyReport, SafetySignal } from '../types';
import { defaultSafetyReport, sampleScamExamples } from '../data/mockData';

interface SafetyCenterViewProps {
  initialUrl?: string;
  initialContent?: string;
  onNavigate: (view: ViewType) => void;
}

export const SafetyCenterView: React.FC<SafetyCenterViewProps> = ({
  initialUrl = '',
  initialContent = '',
  onNavigate,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [content, setContent] = useState(initialContent);
  const [useHighThinking, setUseHighThinking] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<SafetyReport>(defaultSafetyReport);
  const [hasScanned, setHasScanned] = useState(true);
  const [reportedSuccess, setReportedSuccess] = useState(false);

  const handleScan = async (overrideUrl?: string, overrideContent?: string) => {
    const targetUrl = overrideUrl !== undefined ? overrideUrl : url;
    const targetContent = overrideContent !== undefined ? overrideContent : content;

    if (!targetUrl && !targetContent) return;

    setIsScanning(true);
    setReportedSuccess(false);

    try {
      const response = await fetch('/api/ai/scan-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          content: targetContent,
          useHighThinking,
        }),
      });

      const data = await response.json();
      if (data?.report) {
        setReport(data.report);
        setHasScanned(true);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleLoadSample = (sample: typeof sampleScamExamples[0]) => {
    setUrl(sample.url);
    setContent(sample.content);
    handleScan(sample.url, sample.content);
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return { text: 'text-[#ba1a1a]', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-900', stroke: '#ba1a1a' };
    if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900', stroke: '#d97706' };
    return { text: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-900', stroke: '#16a34a' };
  };

  const riskColors = getRiskColor(report.riskScore);

  return (
    <main className="px-4 sm:px-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <section className="flex flex-col gap-1.5 pt-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            SCAM DEFENSE & REPUTATION RADAR
          </span>
          <span className="text-xs text-slate-500 font-semibold">Gemini Security Engine</span>
        </div>
        <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#121b2e] dark:text-white tracking-tight">
          Opportunity Safety Center
        </h1>
        <p className="text-[15px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed max-w-3xl">
          Check before you apply. Our AI scans for upfront fee scams, impersonation fraud, phishing domains, and high-risk recruitment patterns.
        </p>
      </section>

      {/* Preset Quick Test Buttons */}
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider">
          Quick Test Templates:
        </span>
        <div className="flex flex-wrap gap-2">
          {sampleScamExamples.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleLoadSample(s)}
              className="text-[12px] font-semibold bg-white dark:bg-slate-800 text-[#004ac6] dark:text-[#60a5fa] px-3 py-1.5 rounded-lg neu-raised hover:scale-[0.98] transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Section: Analyze Opportunity (Cols 1-6 or 1-12) */}
        <div className={`${hasScanned ? 'lg:col-span-6' : 'lg:col-span-8 lg:col-start-3'} bg-white dark:bg-[#1e293b] rounded-2xl p-5 sm:p-6 neu-raised flex flex-col gap-4 border border-slate-100 dark:border-slate-800`}>
          <div className="flex justify-between items-center">
            <h2 className="text-[18px] font-bold text-[#121b2e] dark:text-white">
              Analyze Opportunity
            </h2>
            {/* High Thinking Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-[12px] font-bold text-[#004ac6] dark:text-[#60a5fa]">
              <input
                type="checkbox"
                checked={useHighThinking}
                onChange={(e) => setUseHighThinking(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-[#004ac6]"
              />
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                Deep Thinking
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#434655] dark:text-[#c3c6d7]" htmlFor="opp-url">
              Opportunity URL (Optional)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737686]">
                link
              </span>
              <input
                id="opp-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#f1f3ff] dark:bg-slate-800 border-none rounded-xl py-3 pl-11 pr-3 text-[14px] text-[#121b2e] dark:text-white placeholder:text-[#737686] dark:placeholder:text-slate-400 neu-inset focus:ring-2 focus:ring-[#004ac6] outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#434655] dark:text-[#c3c6d7]" htmlFor="opp-desc">
              Description or Email Content
            </label>
            <textarea
              id="opp-desc"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the job description, recruiter email, or message here..."
              className="w-full bg-[#f1f3ff] dark:bg-slate-800 border-none rounded-xl p-3 text-[14px] text-[#121b2e] dark:text-white placeholder:text-[#737686] dark:placeholder:text-slate-400 neu-inset focus:ring-2 focus:ring-[#004ac6] outline-none transition-all resize-none leading-relaxed"
            ></textarea>
          </div>

          <button
            onClick={() => handleScan()}
            disabled={isScanning || (!url && !content)}
            className="neu-btn-primary rounded-xl py-3.5 px-6 text-[14px] font-bold text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isScanning ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
                Scanning with AI Security Model...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">search</span>
                Scan Content
              </>
            )}
          </button>
        </div>

        {/* Result Card: Safety Report (Cols 7-12) */}
        {hasScanned && (
          <div className="lg:col-span-6 bg-white dark:bg-[#1e293b] rounded-2xl p-5 sm:p-6 neu-raised flex flex-col gap-5 relative overflow-hidden border border-slate-100 dark:border-slate-800">
            {/* Decorative AI Halo */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-red-400/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <h3 className="text-[19px] font-bold text-[#121b2e] dark:text-white">
                Safety Report
              </h3>
              <span className="text-[11px] font-bold text-[#434655] dark:text-slate-300 bg-[#e9edff] dark:bg-slate-800 py-1 px-2.5 rounded-lg neu-inset">
                Scanned just now
              </span>
            </div>

            {/* Risk Score Section */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border ${riskColors.bg} ${riskColors.border}`}>
              {/* Circular Gauge */}
              <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 neu-raised flex items-center justify-center flex-col shrink-0 relative shadow-sm">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-700"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={riskColors.stroke}
                    strokeDasharray={`${report.riskScore}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`text-[19px] font-extrabold leading-none z-10 ${riskColors.text}`}>
                  {report.riskScore}
                </span>
                <span className="text-[9px] font-bold text-[#737686] dark:text-slate-400 leading-none z-10 mt-0.5">
                  /100
                </span>
              </div>

              <div>
                <h4 className={`text-[17px] font-extrabold ${riskColors.text}`}>
                  {report.riskLevel}
                </h4>
                <p className="text-[13px] text-[#434655] dark:text-[#c3c6d7] mt-0.5 leading-snug">
                  {report.summary}
                </p>
              </div>
            </div>

            {/* Detected Signals */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[14px] font-bold text-[#121b2e] dark:text-white">
                Detected Signals
              </h4>
              <ul className="flex flex-col gap-2">
                {report.detectedSignals.map((signal, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 bg-[#f9f9ff] dark:bg-slate-800/80 p-3 rounded-xl shadow-xs border border-slate-100 dark:border-slate-700/80"
                  >
                    <span
                      className={`material-symbols-outlined mt-0.5 text-[20px] ${
                        signal.severity === 'high'
                          ? 'text-[#ba1a1a]'
                          : signal.severity === 'medium'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {signal.icon || 'warning'}
                    </span>
                    <div>
                      <span className="text-[14px] font-bold text-[#121b2e] dark:text-white block">
                        {signal.title}
                      </span>
                      <span className="text-[12px] text-[#434655] dark:text-[#c3c6d7] leading-relaxed">
                        {signal.description}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendation */}
            <div className="bg-[#f1f3ff] dark:bg-slate-800/90 p-4 rounded-xl neu-inset border border-white/60 dark:border-slate-700">
              <p className="text-[13px] text-[#121b2e] dark:text-white leading-relaxed">
                <strong className="text-[#004ac6] dark:text-[#60a5fa]">Recommendation: </strong>
                {report.recommendation}
              </p>
            </div>

            {/* Verification Checklist */}
            {report.verificationChecklist && report.verificationChecklist.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                <h5 className="text-[12px] font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider">
                  Verification Steps:
                </h5>
                <ul className="space-y-1 text-[13px] text-[#434655] dark:text-[#c3c6d7]">
                  {report.verificationChecklist.map((step, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        check_circle
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setReportedSuccess(true)}
                className="flex-1 bg-white dark:bg-slate-800 border border-[#ba1a1a] text-[#ba1a1a] dark:text-red-400 rounded-xl py-3 px-4 text-[13px] font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
                {reportedSuccess ? 'Reported to Database ✓' : 'Report Opportunity'}
              </button>
              <button
                onClick={() => onNavigate('nebula')}
                className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-[#004ac6] dark:text-[#60a5fa] rounded-xl py-3 px-4 text-[13px] font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                Ask Nebula AI to Investigate
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
