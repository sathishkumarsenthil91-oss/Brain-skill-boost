import React, { useState, useRef } from 'react';
import { UserProfile, NetworkUser } from '../../types';
import { connectivityService } from '../../services/supabaseService';

interface ConnectivityProfileSetupModalProps {
  user: UserProfile;
  existingUsers: NetworkUser[];
  onComplete: (data: {
    userId: string;
    name: string;
    avatarUrl: string;
    skills: string[];
    interests: string[];
    headline?: string;
    bio?: string;
  }) => void;
  onClose?: () => void;
  isFirstTime?: boolean;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
];

const SUGGESTED_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS',
  'Python', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'System Design',
  'Next.js', 'Go', 'GraphQL', 'Drizzle ORM', 'Git',
];

const SUGGESTED_INTERESTS = [
  'AI & Machine Learning', 'Distributed Systems', 'Cloud Architecture',
  'Full-Stack Web', 'Cybersecurity', 'DevOps & CI/CD', 'Open Source',
  'UI/UX Engineering', 'Fintech', 'Mobile Apps', 'High Performance Systems',
];

export const ConnectivityProfileSetupModal: React.FC<ConnectivityProfileSetupModalProps> = ({
  user,
  existingUsers,
  onComplete,
  onClose,
  isFirstTime = true,
}) => {
  // Format initial handle
  const defaultHandle = user.userId || user.username || (user.email ? `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}` : '@developer');
  const cleanHandle = defaultHandle.startsWith('@') ? defaultHandle : `@${defaultHandle}`;

  const [userId, setUserId] = useState(cleanHandle);
  const [name, setName] = useState(user.name || (user.email ? user.email.split('@')[0] : 'Student Developer'));
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || PRESET_AVATARS[0]);
  const [headline, setHeadline] = useState(user.targetRole || user.headline || 'Full Stack Engineer');
  const [bio, setBio] = useState(user.bio || 'Passionate developer building real-world distributed systems, mastering web architectures, and connecting with tech peers.');
  
  const [skills, setSkills] = useState<string[]>(
    user.skills && user.skills.length > 0
      ? user.skills
      : ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS']
  );
  const [interests, setInterests] = useState<string[]>(
    user.interests && user.interests.length > 0
      ? user.interests
      : ['AI & Machine Learning', 'Cloud Architecture', 'Distributed Systems', 'Full-Stack Web']
  );

  const [newSkillInput, setNewSkillInput] = useState('');
  const [newInterestInput, setNewInterestInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle User ID sanitization & check
  const handleUserIdChange = (val: string) => {
    let formatted = val.trim();
    if (!formatted.startsWith('@')) {
      formatted = `@${formatted}`;
    }
    // Allow only alphanumeric and underscores
    formatted = formatted.replace(/[^a-zA-Z0-9_@]/g, '');
    setUserId(formatted);
  };

  const isUserIdTaken = existingUsers.some(
    (u) =>
      u.id !== user.email &&
      (u.userId?.toLowerCase() === userId.toLowerCase() ||
        `@${u.username?.toLowerCase()}` === userId.toLowerCase())
  );

  // Photo file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) setAvatarUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Skill management
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Interest management
  const handleToggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleAddCustomInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
    }
    setNewInterestInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || userId === '@' || isUserIdTaken) return;
    if (!name.trim()) return;

    onComplete({
      userId: userId.trim(),
      name: name.trim(),
      avatarUrl,
      skills,
      interests,
      headline: headline.trim(),
      bio: bio.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-5 sm:p-7 max-w-xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isFirstTime ? 'Set Up Your Connectivity Profile' : 'Edit Professional Profile'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFirstTime
                  ? 'Define your unique User ID handle, photo, skills, and areas of interest.'
                  : 'Update your visible credentials, handle, and technical specializations.'}
              </p>
            </div>
          </div>
          {onClose && !isFirstTime && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Unique User ID Handle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-purple-600">alternate_email</span>
                Unique User ID Handle
              </label>
              {userId.length > 2 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isUserIdTaken
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isUserIdTaken ? '⚠️ Handle Taken' : '✓ Available'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={userId}
                onChange={(e) => handleUserIdChange(e.target.value)}
                placeholder="@username"
                required
                className={`w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none border transition-all ${
                  isUserIdTaken
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Peers can discover and chat with you directly using this unique handle.
            </p>
          </div>

          {/* 2. Full Name & Headline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Sathish Kumar"
                className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                Target Role / Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Full Stack Engineer"
                className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500"
              />
            </div>
          </div>

          {/* 3. Avatar / Photo Selector */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Profile Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-purple-500 shrink-0 shadow-md"
              />
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">upload</span>
                    Upload Photo
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-[11px] text-slate-400">or pick a preset:</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <img
                      key={idx}
                      src={preset}
                      alt={`Preset ${idx + 1}`}
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-8 h-8 rounded-xl object-cover cursor-pointer border-2 transition-transform hover:scale-110 ${
                        avatarUrl === preset ? 'border-purple-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Technical Skills */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">code</span>
                Technical Skills ({skills.length})
              </span>
              <span className="text-[10px] text-slate-400">Click a chip to remove</span>
            </label>
            
            {/* Active Skill Chips */}
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  onClick={() => handleRemoveSkill(skill)}
                  className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-100 hover:text-rose-600 hover:border-rose-300 transition-colors"
                  title="Click to remove"
                >
                  {skill}
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-slate-400 italic py-0.5">No skills added yet.</span>
              )}
            </div>

            {/* Add Custom Skill */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(newSkillInput);
                  }
                }}
                placeholder="Add custom skill (e.g. Next.js, Rust)..."
                className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(newSkillInput)}
                disabled={!newSkillInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                + Add
              </button>
            </div>

            {/* Suggested Skills */}
            <div className="mt-2">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Suggestions:</span>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-purple-600 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Interests & Focus Areas */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">interests</span>
                Interests & Focus Areas ({interests.length})
              </span>
              <span className="text-[10px] text-slate-400">Select relevant domains</span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_INTERESTS.map((interest) => {
                const isSelected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleToggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Interest Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newInterestInput}
                onChange={(e) => setNewInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomInterest(newInterestInput);
                  }
                }}
                placeholder="Add custom interest (e.g. LLM Agents, Web3)..."
                className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => handleAddCustomInterest(newInterestInput)}
                disabled={!newInterestInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                + Add
              </button>
            </div>
          </div>

          {/* 6. Professional Bio */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Professional Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Tell others what you are learning and building..."
              className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            {onClose && !isFirstTime && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isUserIdTaken || !userId.trim() || userId === '@'}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {isFirstTime ? 'Complete Setup & Enter Network' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
