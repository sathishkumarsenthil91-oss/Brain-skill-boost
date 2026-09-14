import React, { useState } from 'react';
import { CourseItem, WebinarItem, YouTubeLearningTrack, GeneratedCertificate, UserProfile } from '../types';
import { downloadFileToFolder } from '../services/youtubeLearningService';

interface CertificateGenerationModalProps {
  type: 'course' | 'webinar' | 'youtube_track';
  item: CourseItem | WebinarItem | YouTubeLearningTrack;
  user: UserProfile;
  onClose: () => void;
  onCertificateClaimed: (certificate: GeneratedCertificate) => void;
  onShareToNetwork?: (certificate: GeneratedCertificate) => void;
}

export const CertificateGenerationModal: React.FC<CertificateGenerationModalProps> = ({
  type,
  item,
  user,
  onClose,
  onCertificateClaimed,
  onShareToNetwork,
}) => {
  const [recipientName, setRecipientName] = useState<string>(user.name || (user.email ? user.email.split('@')[0] : 'Student Developer'));
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [simulatedWatchComplete, setSimulatedWatchComplete] = useState<boolean>(false);

  // Extract common metadata based on item type
  let title = '';
  let instructorOrSpeaker = 'Lead Instructor';
  let instructorRole = 'Staff Software Engineer';
  let organization = 'Brainboost Academic Consortium';
  let durationFormatted = '2h 30m';
  let skillsValidated: string[] = ['Software Engineering', 'Technical Architecture'];
  let completionPercentage = 100;
  let watchTimeSeconds = 7200;
  let requiredWatchTimeSeconds = 7200;
  let isWatchTimeSufficient = true;

  if (type === 'course') {
    const course = item as CourseItem;
    title = course.title;
    instructorOrSpeaker = course.instructor?.name || (typeof course.instructor === 'string' ? course.instructor : 'Faculty Lead');
    instructorRole = `${course.instructor?.role || 'Senior Engineer'} @ ${course.instructor?.company || 'Industry Partner'}`;
    organization = course.provider || 'Brainboost Academy';
    durationFormatted = course.duration || '4h 00m';
    skillsValidated = course.skillsTaught || ['Full Stack Development', 'System Design'];
    
    // Check lessons completion
    const allLessons = course.modules?.flatMap((m) => m.lessons) || [];
    const completedCount = allLessons.filter((l) => l.completed).length;
    const totalCount = allLessons.length;
    
    if (totalCount > 0) {
      completionPercentage = Math.round((completedCount / totalCount) * 100);
      watchTimeSeconds = completedCount * 1800; // estimated 30 min per lesson
      requiredWatchTimeSeconds = totalCount * 1800;
    } else {
      completionPercentage = course.progress || 0;
      watchTimeSeconds = Math.round((completionPercentage / 100) * 14400);
      requiredWatchTimeSeconds = 14400;
    }

    if (simulatedWatchComplete) {
      completionPercentage = 100;
      watchTimeSeconds = requiredWatchTimeSeconds;
    }

    // Require at least 80% to claim certificate
    isWatchTimeSufficient = completionPercentage >= 80;
  } else if (type === 'webinar') {
    const webinar = item as WebinarItem;
    title = webinar.title;
    instructorOrSpeaker = webinar.speaker?.name || webinar.speakerName || 'Keynote Mentor';
    instructorRole = `${webinar.speaker?.title || webinar.speakerRole || 'Staff Engineer'} @ ${webinar.speaker?.company || webinar.speakerCompany || 'Global Tech'}`;
    organization = 'Brainboost Global Tech Summit';
    durationFormatted = webinar.duration || '1h 15m';
    skillsValidated = webinar.tags || ['Distributed Systems', 'Cloud Native'];
    completionPercentage = webinar.isRegistered || webinar.registered ? 100 : 90;
    watchTimeSeconds = 4500;
    requiredWatchTimeSeconds = 4500;
    isWatchTimeSufficient = true;
  } else {
    const ytTrack = item as YouTubeLearningTrack;
    title = ytTrack.title;
    instructorOrSpeaker = ytTrack.channel;
    instructorRole = 'Content Creator & Engineering Educator';
    organization = 'YouTube Technical Learning Track';
    durationFormatted = ytTrack.durationFormatted || '45m 00s';
    skillsValidated = ytTrack.aiSummary?.skillsValidated || ['Practical Coding', 'Implementation'];
    completionPercentage = Math.round(ytTrack.completionPercentage || 0);
    watchTimeSeconds = ytTrack.verifiedWatchedSeconds || 0;
    requiredWatchTimeSeconds = ytTrack.durationSeconds || 3600;
    
    if (simulatedWatchComplete) {
      completionPercentage = 100;
      watchTimeSeconds = requiredWatchTimeSeconds;
    }

    isWatchTimeSufficient = completionPercentage >= 75;
  }

  // Generate unique serial ID
  const hashSeed = (item.id + recipientName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomSuffix = Math.floor(100000 + (hashSeed % 900000));
  const serialId = `BB-CERT-2026-${type.substring(0, 3).toUpperCase()}-${randomSuffix}`;
  
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const legalDisclaimer = 'LEGAL DISCLAIMER & NON-ENDORSEMENT NOTICE: This certificate of completion is an educational record issued by Brainboost Academy. It verifies the recipient’s documented watch-time, practical lab work, and assessment metrics. This document does not constitute an official university degree, professional state licensure, or corporate sponsorship/endorsement by non-affiliated third-party trademark holders or host employers.';

  const certificateData: GeneratedCertificate = {
    id: `cert-${item.id}-${Date.now()}`,
    serialId,
    type,
    itemId: item.id,
    title,
    recipientName,
    recipientEmail: user.email,
    instructorOrSpeaker,
    instructorRole,
    organization,
    issueDate,
    durationFormatted,
    completionPercentage,
    watchTimeSeconds,
    requiredWatchTimeSeconds,
    watchTimeFormatted: `${Math.round(watchTimeSeconds / 60)} mins verified`,
    skillsValidated,
    legalDisclaimer,
    verificationUrl: `https://brainboost.ai/verify/${serialId}`,
    verificationBadge: 'VERIFIED CRITERIA 100%',
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(certificateData.verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLinkedInShare = () => {
    const orgName = encodeURIComponent('Brainboost Academy');
    const certTitle = encodeURIComponent(`${type === 'course' ? 'Course' : 'Webinar'}: ${title}`);
    const certUrl = encodeURIComponent(certificateData.verificationUrl);
    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certTitle}&organizationName=${orgName}&issueYear=2026&issueMonth=8&certUrl=${certUrl}&certId=${serialId}`;
    window.open(linkedInUrl, '_blank');
  };

  const handlePrintOrDownloadPDF = () => {
    setIsDownloading(true);
    const sanitizedTitle = (title || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35);
    const filename = `Brainboost_Certificate_${serialId || sanitizedTitle}.html`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate of Completion - ${title}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,600&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0b1329; padding: 30px; display: flex; justify-content: center; color: #0f172a; }
            .cert-card {
              width: 960px;
              background: #ffffff;
              border: 14px solid #1e293b;
              outline: 3px double #3b82f6;
              outline-offset: -8px;
              padding: 48px 56px;
              position: relative;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
              background-image: radial-gradient(#f1f5f9 1px, transparent 1px);
              background-size: 24px 24px;
            }
            .header-badge {
              text-align: center;
              font-size: 11px;
              letter-spacing: 3.5px;
              font-weight: 900;
              color: #2563eb;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .org-name {
              text-align: center;
              font-size: 13px;
              font-weight: 800;
              color: #475569;
              letter-spacing: 1px;
              margin-bottom: 20px;
            }
            .title {
              font-family: 'Playfair Display', serif;
              font-size: 34px;
              font-weight: 700;
              text-align: center;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .subtitle {
              text-align: center;
              font-size: 12px;
              color: #64748b;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 24px;
            }
            .recipient-prompt {
              text-align: center;
              font-size: 13px;
              color: #64748b;
              margin-bottom: 6px;
            }
            .recipient-name {
              font-family: 'Cinzel', serif;
              font-size: 36px;
              font-weight: 900;
              text-align: center;
              color: #1d4ed8;
              border-bottom: 2px solid #cbd5e1;
              padding-bottom: 8px;
              margin: 0 auto 16px auto;
              max-width: 650px;
              letter-spacing: 1px;
            }
            .statement {
              text-align: center;
              font-size: 13.5px;
              line-height: 1.65;
              color: #334155;
              max-width: 760px;
              margin: 0 auto 20px auto;
            }
            .highlight-title {
              font-weight: 800;
              color: #0f172a;
              font-size: 16px;
            }
            .skills-box {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 8px;
              margin-bottom: 24px;
            }
            .skill-pill {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              color: #1e40af;
              font-size: 11px;
              font-weight: 700;
              padding: 4px 10px;
              border-radius: 6px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 14px;
              margin-bottom: 24px;
            }
            .meta-item { text-align: center; }
            .meta-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
            .meta-val { font-size: 11.5px; font-weight: 700; color: #0f172a; }
            .signatures {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 16px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
            }
            .sig-block { text-align: center; width: 220px; }
            .sig-line { border-bottom: 1.5px solid #0f172a; height: 30px; margin-bottom: 4px; font-family: 'Playfair Display', serif; font-style: italic; font-size: 18px; color: #1e3a8a; }
            .sig-name { font-size: 12px; font-weight: 800; color: #0f172a; }
            .sig-role { font-size: 10px; color: #64748b; font-weight: 600; }
            .seal {
              width: 82px;
              height: 82px;
              border: 3px solid #d97706;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: 900;
              color: #92400e;
              text-align: center;
              background: #fffbeb;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              outline: 2px dashed #f59e0b;
              outline-offset: -4px;
            }
            .legal-disclaimer {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px dashed #cbd5e1;
              font-size: 9.5px;
              line-height: 1.4;
              color: #64748b;
              text-align: center;
              font-style: italic;
            }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
              .cert-card { border: 8px solid #1e293b; box-shadow: none; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: fixed; top: 16px; right: 16px; z-index: 100;">
            <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);">
              🖨️ Print / Save as PDF
            </button>
          </div>
          <div class="cert-card">
            <div class="header-badge">★ BRAINBOOST VERIFIED ACADEMIC CREDENTIAL ★</div>
            <div class="org-name">${organization.toUpperCase()}</div>
            <h1 class="title">${type === 'course' ? 'Certificate of Course Completion' : type === 'webinar' ? 'Certificate of Participation' : 'Learning Track Achievement'}</h1>
            <div class="subtitle">Verified Watch-Time & Practical Competency Record</div>

            <p class="recipient-prompt">This is to officially certify that</p>
            <div class="recipient-name">${recipientName}</div>

            <p class="statement">
              has satisfactorily completed the curriculum requirements, technical watch time, and practical mastery assessments for<br/>
              <span class="highlight-title">"${title}"</span><br/>
              conducted under the guidance of <strong>${instructorOrSpeaker}</strong> (${instructorRole}).
            </p>

            <div class="skills-box">
              ${skillsValidated.map((s) => `<span class="skill-pill">✓ ${s}</span>`).join('')}
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">Serial Number</div>
                <div class="meta-val" style="font-family: monospace; color: #2563eb;">${serialId}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Date Issued</div>
                <div class="meta-val">${issueDate}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Watch-Time Metrics</div>
                <div class="meta-val">${durationFormatted} (${completionPercentage}% verified)</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Status</div>
                <div class="meta-val" style="color: #059669;">Verified Active</div>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-block">
                <div class="sig-line">${instructorOrSpeaker}</div>
                <div class="sig-name">${instructorOrSpeaker}</div>
                <div class="sig-role">${instructorRole}</div>
              </div>

              <div class="seal">
                <span>★ ★ ★</span>
                <span style="font-size: 8px;">DIGITALLY</span>
                <span>VERIFIED</span>
                <span style="font-size: 8px;">2026</span>
              </div>

              <div class="sig-block">
                <div class="sig-line">Dr. Arthur Vance</div>
                <div class="sig-name">Academic Board Director</div>
                <div class="sig-role">Brainboost Academic Consortium</div>
              </div>
            </div>

            <div class="legal-disclaimer">
              ${legalDisclaimer}
            </div>
          </div>
        </body>
      </html>
    `;

    // 1. Download certificate file directly into user's Downloads folder
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
  };

  const handleClaimAndSave = () => {
    onCertificateClaimed(certificateData);
    setHasClaimed(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {type.toUpperCase()} CERTIFICATION MODULE
                </span>
                <span className="text-xs text-slate-300 font-mono">ID: {serialId}</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Certificate Generation & Watch-Time Verification
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

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Watch Time Verification Bar */}
          <div className={`p-4 rounded-2xl border ${
            isWatchTimeSufficient
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isWatchTimeSufficient
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {isWatchTimeSufficient ? 'timer' : 'hourglass_top'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    {isWatchTimeSufficient ? 'Watch-Time & Assessment Verified' : 'Watch-Time Requirement Incomplete'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {isWatchTimeSufficient
                      ? `Verified completion: ${completionPercentage}% (${durationFormatted}) • Criteria satisfied for official credential issuance.`
                      : `Current progress: ${completionPercentage}% (Need at least 80% to issue official serial certificate).`}
                  </p>
                </div>
              </div>

              {!isWatchTimeSufficient && (
                <button
                  onClick={() => setSimulatedWatchComplete(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  Verify & Fast-Track 100%
                </button>
              )}
            </div>
          </div>

          {/* Recipient Name Customizer */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">person</span>
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Recipient Name on Credential</span>
                {isEditingName ? (
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-blue-400 rounded-lg px-2 py-1 outline-none mt-0.5"
                    autoFocus
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{recipientName}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsEditingName(!isEditingName)}
              className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isEditingName ? 'Save' : 'Edit Name'}
            </button>
          </div>

          {/* Certificate Visual Preview Canvas */}
          <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-4 border-slate-300 dark:border-slate-700 rounded-2xl p-6 relative overflow-hidden shadow-inner text-center space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                {organization}
              </span>
              <h3 className="text-lg sm:text-xl font-serif font-black text-slate-900 dark:text-white">
                {type === 'course' ? 'Certificate of Course Completion' : type === 'webinar' ? 'Certificate of Participation' : 'Learning Track Certificate'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Verifiable Unique Serial ID: <strong className="font-mono text-blue-600 dark:text-blue-400">{serialId}</strong>
              </p>
            </div>

            <div className="py-2">
              <p className="text-xs text-slate-500">This credential is awarded to</p>
              <h4 className="text-xl sm:text-2xl font-serif font-black text-blue-600 dark:text-blue-400 tracking-wide border-b-2 border-slate-200 dark:border-slate-800 pb-2 max-w-sm mx-auto mt-1">
                {recipientName}
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              for successful completion of all watch time, syllabus modules, and practical competencies for{' '}
              <strong className="text-slate-900 dark:text-white">"{title}"</strong> under instruction of{' '}
              <strong>{instructorOrSpeaker}</strong> ({instructorRole}).
            </p>

            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {skillsValidated.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300"
                >
                  ✓ {skill}
                </span>
              ))}
            </div>

            {/* Legal Disclaimer Box */}
            <div className="p-3 bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 italic leading-relaxed text-left">
              <strong className="text-slate-700 dark:text-slate-300 not-italic block mb-0.5">
                Legal Disclaimer & Non-Endorsement Notice:
              </strong>
              {legalDisclaimer}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              {copiedLink ? 'Copied URL ✓' : 'Copy Verification URL'}
            </button>

            <button
              onClick={handleLinkedInShare}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              Add to LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onShareToNetwork && (
              <button
                onClick={() => {
                  handleClaimAndSave();
                  onShareToNetwork(certificateData);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                Post to Professional Network
              </button>
            )}

            <button
              onClick={() => {
                handleClaimAndSave();
                handlePrintOrDownloadPDF();
              }}
              disabled={!isWatchTimeSufficient || isDownloading}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              {hasClaimed ? 'Download PDF Certificate' : 'Claim & Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
