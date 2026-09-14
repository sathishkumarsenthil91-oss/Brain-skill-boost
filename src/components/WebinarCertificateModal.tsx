import React, { useState, useRef } from 'react';
import { WebinarItem, WebinarCertificate, UserProfile } from '../types';
import { downloadFileToFolder } from '../services/youtubeLearningService';

interface WebinarCertificateModalProps {
  webinar: WebinarItem;
  user: UserProfile;
  onClose: () => void;
  onCertificateClaimed?: (cert: WebinarCertificate) => void;
}

export const WebinarCertificateModal: React.FC<WebinarCertificateModalProps> = ({
  webinar,
  user,
  onClose,
  onCertificateClaimed,
}) => {
  const [recipientName, setRecipientName] = useState<string>(user.name || (user.email ? user.email.split('@')[0] : 'Student Developer'));
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const certificateCardRef = useRef<HTMLDivElement>(null);

  // Generate deterministic or existing certificate ID
  const certId = webinar.claimedCertificate?.certificateId || `IS-WEB-2026-${webinar.id.replace('web-', 'W')}${Math.floor(1000 + Math.random() * 9000)}`;
  const issueDate = webinar.claimedCertificate?.issueDate || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certificateData: WebinarCertificate = {
    certificateId: certId,
    webinarId: webinar.id,
    webinarTitle: webinar.title,
    recipientName: recipientName,
    recipientEmail: user.email,
    speakerName: webinar.speaker?.name || webinar.speakerName || 'Lead Speaker',
    speakerRole: webinar.speaker?.title || webinar.speakerRole || 'Keynote Mentor',
    speakerCompany: webinar.speaker?.company || webinar.speakerCompany || 'Industry Leader',
    issueDate: issueDate,
    duration: webinar.duration,
    tags: webinar.tags || ['Tech Talk', 'Engineering Masterclass'],
    issuer: 'Brainboost Global Tech Summit & Engineering Academic Consortium',
    verificationUrl: `https://brainboost.ai/verify/${certId}`,
  };

  const handleCopyVerification = () => {
    navigator.clipboard.writeText(certificateData.verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLinkedInShare = () => {
    const orgName = encodeURIComponent('Brainboost Academy');
    const certTitle = encodeURIComponent(`Masterclass: ${webinar.title}`);
    const certUrl = encodeURIComponent(certificateData.verificationUrl);
    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certTitle}&organizationName=${orgName}&issueYear=2026&issueMonth=2&certUrl=${certUrl}&certId=${certId}`;
    window.open(linkedInUrl, '_blank');
  };

  const handlePrintOrDownload = () => {
    setIsDownloading(true);
    const sanitizedTitle = (webinar.title || 'Webinar_Certificate').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35);
    const filename = `Brainboost_Webinar_Certificate_${certId || sanitizedTitle}.html`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate of Participation - ${webinar.title}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0f172a; padding: 40px; display: flex; justify-content: center; }
            .cert-container {
              width: 900px;
              background: #ffffff;
              border: 12px solid #1e1b4b;
              outline: 2px dashed #6366f1;
              outline-offset: -8px;
              padding: 48px;
              position: relative;
              color: #0f172a;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .header-badge {
              text-align: center;
              font-size: 11px;
              letter-spacing: 3px;
              font-weight: 900;
              color: #4338ca;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .title {
              font-family: 'Playfair Display', serif;
              font-size: 32px;
              font-weight: 700;
              text-align: center;
              color: #1e1b4b;
              margin-bottom: 4px;
            }
            .subtitle {
              text-align: center;
              font-size: 13px;
              color: #64748b;
              font-weight: 600;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 28px;
            }
            .recipient-prompt {
              text-align: center;
              font-size: 13px;
              color: #475569;
              margin-bottom: 8px;
            }
            .recipient-name {
              font-family: 'Playfair Display', serif;
              font-size: 34px;
              font-weight: 700;
              text-align: center;
              color: #2563eb;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
              margin: 0 auto 20px auto;
              max-width: 600px;
            }
            .statement {
              text-align: center;
              font-size: 14px;
              line-height: 1.6;
              color: #334155;
              max-width: 700px;
              margin: 0 auto 24px auto;
            }
            .webinar-highlight {
              font-weight: 800;
              color: #0f172a;
              font-size: 16px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 32px;
            }
            .meta-item { text-align: center; }
            .meta-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .meta-val { font-size: 12px; font-weight: 700; color: #0f172a; }
            .signatures {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 24px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            }
            .sig-block { text-align: center; width: 220px; }
            .sig-line { border-bottom: 1px solid #0f172a; height: 32px; margin-bottom: 6px; font-family: 'Playfair Display', serif; font-style: italic; font-size: 18px; color: #1e1b4b; }
            .sig-name { font-size: 12px; font-weight: 800; color: #0f172a; }
            .sig-role { font-size: 10px; color: #64748b; font-weight: 600; }
            .seal {
              width: 80px;
              height: 80px;
              border: 3px solid #eab308;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: 900;
              color: #a16207;
              text-align: center;
              background: #fefce8;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
              .cert-container { border: 8px solid #1e1b4b; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: fixed; top: 16px; right: 16px; z-index: 100;">
            <button onclick="window.print()" style="padding: 12px 24px; background: #4338ca; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);">
              🖨️ Print / Save as PDF
            </button>
          </div>
          <div class="cert-container">
            <div class="header-badge">BRAINBOOST GLOBAL TECH TALKS • ACADEMIC SUMMIT</div>
            <h1 class="title">Certificate of Participation</h1>
            <div class="subtitle">Official Tech Masterclass & Technical AMA Record</div>

            <p class="recipient-prompt">This credential certifies that</p>
            <div class="recipient-name">${recipientName}</div>

            <p class="statement">
              has actively attended and participated in the live industry engineering session on<br/>
              <span class="webinar-highlight">"${webinar.title}"</span><br/>
              led by <strong style="color: #4338ca;">${webinar.speaker?.name || webinar.speakerName}</strong> (${webinar.speaker?.title || webinar.speakerRole} @ <strong>${webinar.speaker?.company || webinar.speakerCompany}</strong>).
            </p>

            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">Session Duration</div>
                <div class="meta-val">${webinar.duration}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Date Issued</div>
                <div class="meta-val">${issueDate}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Category</div>
                <div class="meta-val">${webinar.category || 'Tech Masterclass'}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Certificate ID</div>
                <div class="meta-val" style="font-family: monospace; color: #4338ca;">${certId}</div>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-block">
                <div class="sig-line">${webinar.speaker?.name || webinar.speakerName}</div>
                <div class="sig-name">${webinar.speaker?.name || webinar.speakerName}</div>
                <div class="sig-role">${webinar.speaker?.title || webinar.speakerRole} (${webinar.speaker?.company || webinar.speakerCompany})</div>
              </div>

              <div class="seal">
                <span>★ ★ ★</span>
                <span>VERIFIED</span>
                <span>SUMMIT</span>
              </div>

              <div class="sig-block">
                <div class="sig-line">Dr. Arthur Vance</div>
                <div class="sig-name">Academic Board Director</div>
                <div class="sig-role">Brainboost Foundation</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // 1. Download certificate file directly into user's folder
    downloadFileToFolder(html, filename, 'text/html');

    // 2. Open print dialog for PDF saving if available
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (e) {
      console.log('Popup blocked, file was saved directly to Downloads folder.');
    }
    setIsDownloading(false);

    if (onCertificateClaimed) {
      onCertificateClaimed(certificateData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  VERIFIED ATTENDANCE
                </span>
                <span className="text-xs text-slate-300 font-mono">ID: {certId}</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Webinar Certificate of Participation
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Certificate Preview Card */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Visual Certificate Box */}
          <div
            ref={certificateCardRef}
            className="relative bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-[#131b2e] dark:via-[#17233f] dark:to-[#131b2e] border-4 border-indigo-900/30 dark:border-indigo-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-inner"
          >
            {/* Corner Decorative Ornaments */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-600 dark:border-indigo-400" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-600 dark:border-indigo-400" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-600 dark:border-indigo-400" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-600 dark:border-indigo-400" />

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-black tracking-widest uppercase">
                <span>🎓</span> BRAINBOOST GLOBAL TECH TALKS & SUMMIT
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Certificate of Participation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                Industry Masterclass & Live Technical Engineering AMA
              </p>
            </div>

            {/* Recipient Name Display / Edit */}
            <div className="py-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                This certifies that
              </p>
              {isEditingName ? (
                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl text-center text-base font-bold text-slate-900 dark:text-white focus:outline-none w-full"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 group">
                  <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 border-b-2 border-dashed border-blue-300 dark:border-blue-700 pb-0.5 px-2">
                    {recipientName}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors cursor-pointer"
                    title="Edit Name"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>
              )}
            </div>

            {/* Participation Statement */}
            <div className="space-y-1.5 max-w-lg mx-auto text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                has successfully participated in the interactive technical workshop:
              </p>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                "{webinar.title}"
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Keynote Speaker: <strong className="text-slate-800 dark:text-slate-200">{webinar.speaker?.name || webinar.speakerName}</strong> ({webinar.speaker?.title || webinar.speakerRole} @ <strong className="text-purple-600 dark:text-purple-400">{webinar.speaker?.company || webinar.speakerCompany}</strong>)
              </p>
            </div>

            {/* Certificate Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-left bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Duration</span>
                <strong className="text-slate-800 dark:text-slate-200">{webinar.duration}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Date Issued</span>
                <strong className="text-slate-800 dark:text-slate-200">{issueDate}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Platform</span>
                <strong className="text-purple-600 dark:text-purple-400">Zoom / YouTube Live</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Record ID</span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] truncate block">{certId}</strong>
              </div>
            </div>

            {/* Signature & Seal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-left">
                <p className="font-serif italic font-bold text-slate-900 dark:text-white text-sm">
                  {webinar.speaker?.name || webinar.speakerName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {webinar.speaker?.title || webinar.speakerRole} • {webinar.speaker?.company || webinar.speakerCompany}
                </p>
              </div>

              <div className="w-12 h-12 rounded-full border-2 border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 flex flex-col items-center justify-center text-[8px] font-black text-amber-700 dark:text-amber-300">
                <span>★</span>
                <span>SEAL</span>
              </div>

              <div className="text-right">
                <p className="font-serif italic font-bold text-slate-900 dark:text-white text-sm">
                  Arthur Vance, Ph.D.
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Director, Academic Board
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyVerification}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedLink ? 'check' : 'link'}
                </span>
                {copiedLink ? 'Link Copied!' : 'Copy Verify URL'}
              </button>

              <button
                onClick={handleLinkedInShare}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#084e96] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>in</span>
                Add to LinkedIn
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={handlePrintOrDownload}
                disabled={isDownloading}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {isDownloading ? 'Generating PDF...' : 'Download / Print PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
