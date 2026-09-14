import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ViewType, SkillItem, UnofficialLearningRecord } from '../types';
import { UnofficialRecordModal } from './UnofficialRecordModal';
import { downloadRecordAsPDF } from '../services/youtubeLearningService';
import { DEFAULT_USER_AVATAR } from '../data/mockData';

interface ProfileViewProps {
  user: UserProfile;
  skills: SkillItem[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (view: ViewType) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  skills,
  onUpdateProfile,
  onNavigate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(user);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'achievements' | 'records'>('overview');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Profile photo upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Sync formData with user whenever edit modal opens
  useEffect(() => {
    if (isEditing) {
      setFormData(user);
      setPhotoSuccess(null);
      setPhotoError(null);
    }
  }, [isEditing, user]);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WebP, GIF)');
      setPhotoSuccess(null);
      return;
    }
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData((prev) => ({ ...prev, avatarUrl: compressedDataUrl }));
          setPhotoSuccess('New photo selected. Click "Save Changes" to apply.');
        }
      };
      img.onerror = () => {
        setPhotoError('Failed to process the image. Please choose another photo.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setPhotoError('Could not read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleResetAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: DEFAULT_USER_AVATAR }));
    setPhotoSuccess('Reset to default avatar. Click "Save Changes" to apply.');
    setPhotoError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const foundationSkills = skills.filter((s) => s.category === 'foundation');
  const gapSkills = skills.filter((s) => s.category === 'gap');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white/30 shadow-xl"
              />
              <button
                onClick={() => {
                  setIsEditing(true);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer text-[11px] font-bold gap-1 backdrop-blur-xs"
                title="Change Profile Photo"
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                <span>Change</span>
              </button>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white dark:border-slate-900 w-5 h-5 rounded-full" title="Active Student" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{user.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs">
                  {user.gradYear} Batch
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950">
                  Top 5% Readiness
                </span>
              </div>
              <p className="text-blue-100 text-[14px] flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[18px]">school</span>
                {user.degree} • {user.college}
              </p>
              <p className="text-blue-100/90 text-[13px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                {user.location || 'San Francisco Bay Area'} • Target: <span className="font-bold text-white">{user.targetRole}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13px] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Profile
            </button>
            <button
              onClick={() => onNavigate('nebula')}
              className="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-900 text-white font-bold text-[13px] rounded-xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              AI Career Review
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15 text-white">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Role Readiness</p>
            <p className="text-2xl font-black mt-0.5">{user.overallReadiness}%</p>
            <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">↑ +14% this month</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Skills Mastered</p>
            <p className="text-2xl font-black mt-0.5">{foundationSkills.length} / {skills.length}</p>
            <p className="text-[11px] text-blue-200 mt-0.5">{gapSkills.length} in active sprint</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Assignments</p>
            <p className="text-2xl font-black mt-0.5">{user.completedAssignmentsCount || 12}</p>
            <p className="text-[11px] text-blue-200 mt-0.5">98% Avg Quality Score</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Certifications</p>
            <p className="text-2xl font-black mt-0.5">{user.certificationsCount || 3}</p>
            <p className="text-[11px] text-amber-200 font-semibold mt-0.5">1 exam scheduled</p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          Profile updated successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
          Overview & Bio
        </button>
        <button
          onClick={() => setActiveTab('resume')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'resume'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">description</span>
          Resume & ATS Score
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'achievements'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">military_tech</span>
          Badges & Skills
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'records'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">school</span>
          Verified Learning Records & Portfolio ({user.learningRecords?.length || 1})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Bio & Links */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">badge</span>
                About Me
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {user.bio ||
                  'Passionate computer science student aiming for full-stack engineering roles with strong foundations in React, TypeScript, scalable Node APIs, and distributed cloud services.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-sm">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase">Email</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase">Phone</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{user.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase">Academic Degree</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{user.degree || 'B.Tech / Bachelor of Science'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase">GPA Benchmark</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{user.gpa || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Social & Portfolio Links */}
            <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">link</span>
                Professional Links & Portfolio
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a
                  href={user.githubUrl ? (user.githubUrl.startsWith('http') ? user.githubUrl : `https://${user.githubUrl}`) : '#'}
                  target={user.githubUrl ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-500 transition-all flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-2xl text-slate-700 dark:text-slate-200">code_blocks</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-bold">GitHub</p>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {user.githubUrl ? user.githubUrl.replace(/^https?:\/\//, '') : 'Not connected'}
                    </p>
                  </div>
                </a>
                <a
                  href={user.linkedinUrl ? (user.linkedinUrl.startsWith('http') ? user.linkedinUrl : `https://${user.linkedinUrl}`) : '#'}
                  target={user.linkedinUrl ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-500 transition-all flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-2xl text-blue-600">work</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-bold">LinkedIn</p>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {user.linkedinUrl ? user.linkedinUrl.replace(/^https?:\/\//, '') : 'Not connected'}
                    </p>
                  </div>
                </a>
                <a
                  href={user.portfolioUrl ? (user.portfolioUrl.startsWith('http') ? user.portfolioUrl : `https://${user.portfolioUrl}`) : '#'}
                  target={user.portfolioUrl ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-500 transition-all flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-2xl text-emerald-600">language</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-bold">Portfolio</p>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {user.portfolioUrl ? user.portfolioUrl.replace(/^https?:\/\//, '') : 'Not connected'}
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Action Cards */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Target Career Focus</h3>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 mb-4">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Primary Goal</span>
                <p className="text-base font-extrabold text-blue-950 dark:text-blue-100">{user.targetRole}</p>
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1">Tier-1 Tech Companies & High-Growth Startups</p>
              </div>

              <div className="space-y-3 text-xs font-medium">
                <button
                  onClick={() => onNavigate('skill-gap')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">query_stats</span>
                    View Skill Gap Analysis
                  </span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button
                  onClick={() => onNavigate('ai-recommendations')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    See AI Growth Recommendations
                  </span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button
                  onClick={() => onNavigate('opportunities')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">work</span>
                    Browse 19 Matched Internships
                  </span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Resume & ATS Score */}
      {activeTab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Master Resume</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">File: {user.resumeFileName || `${(user.name || 'User').replace(/\s+/g, '_')}_Resume_2026.pdf`}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => alert('Downloaded active resume!')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download
                </button>
                <label className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  Upload New
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onUpdateProfile({ resumeFileName: e.target.files[0].name });
                        alert(`Uploaded ${e.target.files[0].name}`);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* ATS Score Visual */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Brainboost ATS Match Index</span>
                  <h4 className="text-xl font-black mt-0.5">88 / 100 • Excellent Candidate Match</h4>
                </div>
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-black text-lg">
                  88%
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Resume parser identified strong keywords for Full Stack Engineering: React, TypeScript, REST APIs, Git, and PostgreSQL. Adding Docker Compose and Unit Testing keywords will boost score to 96+.
              </p>
            </div>

            {/* Keyword Heatmap */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Detected Keywords vs Target Role</h4>
              <div className="flex flex-wrap gap-2">
                {['React 19', 'TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Git', 'REST APIs', 'Express'].map((kw) => (
                  <span key={kw} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    {kw}
                  </span>
                ))}
                {['Docker Compose', 'CI/CD Pipelines', 'Jest / Vitest', 'Redis Caching'].map((missing) => (
                  <span key={missing} className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Recommended: {missing}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Resume Polish</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Let Nebula AI optimize your bullet points using the Google XYZ formula: <span className="italic font-medium">"Accomplished [X] as measured by [Y], by doing [Z]"</span>.
            </p>
            <button
              onClick={() => onNavigate('nebula')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              Run AI Resume Rewrite
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Achievements & Badges */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {(!user.achievements || user.achievements.length === 0) ? (
            <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <span className="material-symbols-outlined text-4xl text-slate-400">military_tech</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Badges Earned Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Complete assignments, pass technical quizzes, and build daily study streaks to unlock verified career badges.
              </p>
              <button
                onClick={() => onNavigate('courses')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Start Learning
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.achievements.map((ach, idx) => (
                <div key={idx} className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0">
                    {ach.badgeIcon || '🏆'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ach.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ach.description}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      {ach.dateEarned || 'Verified Badge'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Verified Learning Records & Portfolio */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">school</span>
                Verified Self-Directed Learning Records & Portfolio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Unofficial completion certificates earned through real watch time verification in YouTube Skill Tracks.
              </p>
            </div>
            <button
              onClick={() => onNavigate('courses')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Start New Skill Track
            </button>
          </div>

          {(!user.learningRecords || user.learningRecords.length === 0) ? (
            <div className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <span className="material-symbols-outlined text-4xl text-slate-400">history_edu</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Verified Records Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Watch curated technical tracks on YouTube with verified active study time to generate tamper-resistant learning records.
              </p>
              <button
                onClick={() => onNavigate('courses')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Browse YouTube Skill Tracks
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.learningRecords.map((record: UnofficialLearningRecord, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#151f38] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Verified Completion
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-bold">
                        {record.recordId}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {record.videoTitle}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Curated from: <strong className="text-slate-700 dark:text-slate-300">{record.channel}</strong>
                    </p>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Watch Time</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{record.verifiedWatchFormatted}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Completion</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{record.completionPercentage}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{record.completionDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      View Record
                    </button>

                    <button
                      onClick={() => downloadRecordAsPDF(record)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Download Certificate PDF"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>

                    <button
                      onClick={() => {
                        const text = encodeURIComponent(
                          `Excited to share that I completed a self-directed verified technical study course on "${record.videoTitle}" from ${record.channel} via Brainboost.\n\nVerified Watch Time: ${record.verifiedWatchFormatted} (${record.completionPercentage}% verified completion).\nUnofficial Record ID: ${record.recordId}\n#Engineering #ContinuousLearning #FullStack`
                        );
                        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
                      }}
                      className="p-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white transition-colors cursor-pointer"
                      title="Share to LinkedIn"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Unofficial Record Modal */}
      {selectedRecord && (
        <UnofficialRecordModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#151f38] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Student Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-medium">
              {/* Profile Photo Uploader Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs">
                    Profile Photo
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Supports JPG, PNG, WebP (Mobile & Desktop Gallery)
                  </span>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl border-2 transition-all ${
                    isDraggingPhoto
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  {/* Photo Preview */}
                  <div className="relative shrink-0">
                    <img
                      src={formData.avatarUrl || DEFAULT_USER_AVATAR}
                      alt="Profile Preview"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-blue-500/40 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer transition-transform hover:scale-105"
                      title="Upload from Device"
                    >
                      <span className="material-symbols-outlined text-[16px] block">photo_camera</span>
                    </button>
                  </div>

                  {/* Actions & Drop info */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        Upload from Gallery
                      </button>

                      {formData.avatarUrl !== DEFAULT_USER_AVATAR && (
                        <button
                          type="button"
                          onClick={handleResetAvatar}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Drag & drop an image here or click upload to select from your device gallery.
                    </p>

                    {photoSuccess && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center sm:justify-start gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        {photoSuccess}
                      </p>
                    )}

                    {photoError && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center justify-center sm:justify-start gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {photoError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Career Role</label>
                  <input
                    type="text"
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">University / College</label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Degree & Major</label>
                  <input
                    type="text"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={formData.linkedinUrl || ''}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">GitHub Profile URL</label>
                  <input
                    type="text"
                    value={formData.githubUrl || ''}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Bio / Career Pitch</label>
                <textarea
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
