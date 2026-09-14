import React, { useState } from 'react';
import { UnofficialLearningRecord } from '../types';
import { downloadRecordAsPDF } from '../services/youtubeLearningService';

interface UnofficialRecordModalProps {
  record: UnofficialLearningRecord;
  onClose: () => void;
}

export const UnofficialRecordModal: React.FC<UnofficialRecordModalProps> = ({ record, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(record.recordId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(
      `Excited to share that I completed a self-directed verified technical study course on "${record.videoTitle}" from ${record.channel} via Brainboost.\n\nVerified Watch Time: ${record.verifiedWatchFormatted} (${record.completionPercentage}% verified completion).\nUnofficial Record ID: ${record.recordId}\n#Engineering #ContinuousLearning #FullStack`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Certificate Banner */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">school</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
            BRAINBOOST VERIFIED LAB RECORD
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Unofficial Learning Completion Record
          </h3>
        </div>

        {/* Card Body */}
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
          <p className="text-xs text-slate-400">This certifies that</p>
          <div className="text-xl font-black text-white border-b border-slate-700 pb-1 inline-block px-4">
            {record.userName}
          </div>
          <p className="text-xs text-slate-400">has completed verified self-directed study and watch time for:</p>

          <h4 className="text-base font-bold text-blue-300">
            {record.videoTitle}
          </h4>
          <p className="text-xs text-slate-400">Source: <strong>{record.channel}</strong></p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Watch Time</span>
              <span className="text-xs font-black text-white">{record.verifiedWatchFormatted}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Completion</span>
              <span className="text-xs font-black text-emerald-400">{record.completionPercentage}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Completed On</span>
              <span className="text-xs font-black text-white">{record.completionDate}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Record ID</span>
              <span className="text-[11px] font-mono font-bold text-indigo-300 truncate block">
                {record.recordId}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-left text-[11px] text-red-200/90 leading-relaxed">
            <strong>Mandatory Disclaimer:</strong> {record.disclaimer}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCopyId}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied Record ID!' : 'Copy ID'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLinkedIn}
              className="px-4 py-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              Share on LinkedIn
            </button>

            <button
              onClick={() => downloadRecordAsPDF(record)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
