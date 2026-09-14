import React, { useState, useEffect } from 'react';
import { CertificationItem, ViewType } from '../types';
import { initialCertifications } from '../data/mockData';
import { supabaseService } from '../services/supabaseService';

interface CertificationsViewProps {
  onNavigate: (view: ViewType) => void;
}

export const CertificationsView: React.FC<CertificationsViewProps> = ({ onNavigate }) => {
  const [certifications, setCertifications] = useState<CertificationItem[]>(initialCertifications);

  useEffect(() => {
    supabaseService.fetchCertifications().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setCertifications(data);
      }
    });
  }, []);
  const [activeIssuer, setActiveIssuer] = useState<string>('All');
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

  const issuers = ['All', 'Google Cloud', 'Amazon Web Services', 'Meta', 'Linux Foundation / CNCF'];

  const filteredCerts = certifications.filter(
    (c) => activeIssuer === 'All' || c.issuer === activeIssuer
  );

  const handleCopyVoucher = (voucherCode?: string) => {
    if (!voucherCode) return;
    navigator.clipboard.writeText(voucherCode);
    setCopiedVoucher(voucherCode);
    setTimeout(() => setCopiedVoucher(null), 2500);
  };

  const handleToggleStatus = (certId: string) => {
    setCertifications((prev) =>
      prev.map((c) => {
        if (c.id === certId) {
          const nextStatus =
            c.status === 'Completed'
              ? 'In Progress'
              : c.status === 'In Progress'
              ? 'Planned'
              : 'Completed';
          return {
            ...c,
            status: nextStatus,
            examScore: nextStatus === 'Completed' ? 'Passed (910/1000)' : undefined,
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-300/30">
                INDUSTRY CREDENTIALS
              </span>
              <span className="text-xs text-slate-300 font-semibold">Verified Badges & Exams</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Cloud & Engineering Certifications
            </h1>
            <p className="text-slate-200 text-sm max-w-2xl leading-relaxed">
              Accelerate your hiring pipeline with industry-standard credentials from Google, AWS, and Meta. Claim student voucher discounts and prep roadmaps.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
            <div className="text-center px-2">
              <span className="text-2xl font-black text-amber-300">
                {certifications.filter((c) => c.status === 'Completed').length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">Earned</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2">
              <span className="text-2xl font-black text-blue-300">
                {certifications.filter((c) => c.status === 'In Progress').length}
              </span>
              <span className="text-[11px] block text-slate-300 font-semibold">In Progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Issuer Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {issuers.map((issuer) => (
          <button
            key={issuer}
            onClick={() => setActiveIssuer(issuer)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeIssuer === issuer
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#151f38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {issuer}
          </button>
        ))}
      </div>

      {/* Certifications Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCerts.map((cert) => (
          <div
            key={cert.id}
            className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-2xl shrink-0">
                    {cert.badgeIcon || '📜'}
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400">
                      {cert.issuer}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {cert.name}
                    </h3>
                  </div>
                </div>

                <span
                  onClick={() => handleToggleStatus(cert.id)}
                  className={`px-3 py-1 rounded-full text-xs font-extrabold cursor-pointer transition-all hover:scale-105 shrink-0 ${
                    cert.status === 'Completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : cert.status === 'In Progress'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                  title="Click to toggle status"
                >
                  {cert.status === 'Completed' ? '✓ Earned' : cert.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Level</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{cert.level}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Market Value</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{cert.marketValue}</span>
                </div>
                {cert.validUntil && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Valid Until</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{cert.validUntil}</span>
                  </div>
                )}
                {cert.examScore && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Result</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{cert.examScore}</span>
                  </div>
                )}
              </div>

              {/* Voucher Code Box */}
              {cert.voucherCode && (
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase block">
                      Student 50% Exam Discount Voucher
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {cert.voucherCode}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyVoucher(cert.voucherCode)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedVoucher === cert.voucherCode ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => onNavigate('courses')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Study Prep Modules</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>

              <button
                onClick={() => handleToggleStatus(cert.id)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Update Exam Status
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
