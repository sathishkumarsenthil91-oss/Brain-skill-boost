import React, { useState, useEffect } from 'react';

export type LogoStyle = 'surge' | 'helix' | 'prism';

interface BrainboostLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  animated?: boolean;
  className?: string;
  styleVariant?: LogoStyle;
  interactiveToggle?: boolean;
  onClick?: () => void;
}

export const BrainboostLogo: React.FC<BrainboostLogoProps> = ({
  size = 'md',
  showText = false,
  textClassName = '',
  subtitle,
  animated = true,
  className = '',
  styleVariant,
  interactiveToggle = false,
  onClick,
}) => {
  // Global persisted logo style preference with fallback to 'surge'
  const [activeStyle, setActiveStyle] = useState<LogoStyle>(() => {
    if (styleVariant) return styleVariant;
    try {
      const saved = localStorage.getItem('brainboost_logo_style');
      if (saved === 'surge' || saved === 'helix' || saved === 'prism') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'surge';
  });

  // Listen for real-time logo style changes across components
  useEffect(() => {
    if (styleVariant) {
      setActiveStyle(styleVariant);
      return;
    }
    const handleStyleEvent = (e: CustomEvent<LogoStyle>) => {
      if (e.detail) {
        setActiveStyle(e.detail);
      }
    };
    window.addEventListener('brainboost:logo-change' as any, handleStyleEvent);
    return () => {
      window.removeEventListener('brainboost:logo-change' as any, handleStyleEvent);
    };
  }, [styleVariant]);

  // Size mapping
  let px = 38;
  if (typeof size === 'number') {
    px = size;
  } else {
    switch (size) {
      case 'xs':
        px = 24;
        break;
      case 'sm':
        px = 30;
        break;
      case 'md':
        px = 38;
        break;
      case 'lg':
        px = 48;
        break;
      case 'xl':
        px = 64;
        break;
      default:
        px = 38;
    }
  }

  const handleContainerClick = () => {
    if (interactiveToggle) {
      const styles: LogoStyle[] = ['surge', 'helix', 'prism'];
      const nextIdx = (styles.indexOf(activeStyle) + 1) % styles.length;
      const nextStyle = styles[nextIdx];
      setActiveStyle(nextStyle);
      try {
        localStorage.setItem('brainboost_logo_style', nextStyle);
        window.dispatchEvent(new CustomEvent('brainboost:logo-change', { detail: nextStyle }));
      } catch {
        // ignore
      }
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      id="brainboost-brand-container"
      onClick={handleContainerClick}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick || interactiveToggle ? 'cursor-pointer group' : ''
      } ${className}`}
      title={interactiveToggle ? `Brainboost Logo: ${activeStyle.toUpperCase()} (Click to switch design)` : 'Brainboost'}
    >
      {/* Dynamic Emblem Mark */}
      <div
        style={{ width: px, height: px }}
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
      >
        {/* Luminous Ambient Halo for Dark & Light */}
        {animated && (
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/25 to-cyan-400/20 dark:from-indigo-500/35 dark:via-purple-500/35 dark:to-cyan-400/35 blur-md opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}

        {/* ------------------------------------------------------------- */}
        {/* VARIANT 1: NEURAL SURGE (The Iconic Kinetic 'B' Emblem)      */}
        {/* ------------------------------------------------------------- */}
        {activeStyle === 'surge' && (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full relative z-10 drop-shadow-sm transition-all duration-300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Primary Gradient: Deep Indigo -> Electric Violet -> Vivid Cyan */}
              <linearGradient id="bb-surge-main" x1="10%" y1="10%" x2="90%" y2="90%">
                <stop offset="0%" stopColor="#4338ca" className="dark:stop-[#6366f1]" />
                <stop offset="50%" stopColor="#7c3aed" className="dark:stop-[#a855f7]" />
                <stop offset="100%" stopColor="#0284c7" className="dark:stop-[#38bdf8]" />
              </linearGradient>

              {/* Accent Trajectory Gradient: Hyper Neon Energy */}
              <linearGradient id="bb-surge-accent" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="60%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              {/* Central Boost Blade Gradient */}
              <linearGradient id="bb-surge-blade" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              {/* Synapse Glow Filter */}
              <filter id="bb-surge-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Kinetic Shield (Minimalist glass squircle backdrop) */}
            <rect
              x="6"
              y="6"
              width="88"
              height="88"
              rx="26"
              className="fill-slate-100/80 dark:fill-slate-900/90 stroke-slate-200/80 dark:stroke-slate-800 transition-colors"
              strokeWidth="1.5"
            />

            {/* Aerodynamic Spine Pillar */}
            <path
              d="M 28 20 C 28 16 33 16 33 20 L 33 80 C 33 84 28 84 28 80 Z"
              fill="url(#bb-surge-main)"
              className="transition-all"
            />

            {/* Upper Cerebral Lobe (The Brain Synaptic Arc) */}
            <path
              d="M 32 21 C 48 17 68 21 72 34 C 76 46 64 53 46 51"
              stroke="url(#bb-surge-main)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Lower Kinetic Boost Lobe (The Acceleration Turbine) */}
            <path
              d="M 32 50 C 56 47 78 52 79 66 C 80 78 62 82 32 79"
              stroke="url(#bb-surge-accent)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Ascending Boost Chevron / Jet Blade (Slicing 45° Upward) */}
            <path
              d="M 40 60 L 58 42 L 52 42 L 64 30 L 64 42 L 58 42 L 44 64 Z"
              fill="url(#bb-surge-blade)"
              filter="url(#bb-surge-glow)"
              className={animated ? 'animate-pulse' : ''}
            />

            {/* Pulsing Synaptic Node (Genius Spark at Apex) */}
            <circle cx="64" cy="30" r="3.5" fill="#ffffff" filter="url(#bb-surge-glow)">
              {animated && (
                <animate
                  attributeName="r"
                  values="3;4.5;3"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              )}
            </circle>

            {/* Micro Synaptic Star Particle */}
            <path
              d="M 64 22 L 65.5 25.5 L 69 27 L 65.5 28.5 L 64 32 L 62.5 28.5 L 59 27 L 62.5 25.5 Z"
              fill="#38bdf8"
              opacity="0.9"
            >
              {animated && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 64 27"
                  to="360 64 27"
                  dur="6s"
                  repeatCount="indefinite"
                />
              )}
            </path>
          </svg>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VARIANT 2: QUANTUM HELIX (Interlocking Infinite Synapse)      */}
        {/* ------------------------------------------------------------- */}
        {activeStyle === 'helix' && (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full relative z-10 drop-shadow-sm transition-all duration-300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bb-helix-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>

              <linearGradient id="bb-helix-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              <filter id="bb-helix-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Circular Shield */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="fill-slate-100/80 dark:fill-slate-900/90 stroke-slate-200/80 dark:stroke-slate-800 transition-colors"
              strokeWidth="1.5"
            />

            {/* Left Cerebral Helix Arc */}
            <path
              d="M 30 26 C 18 36 18 64 32 74 C 42 81 58 72 64 56 C 70 40 82 32 86 44 C 90 56 78 72 64 74"
              stroke="url(#bb-helix-1)"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={animated ? '180' : undefined}
              className={animated ? 'animate-[spin_12s_linear_infinite]' : ''}
              style={{ transformOrigin: '50% 50%' }}
            />

            {/* Counter-Crossing Boost Synapse Ribbon */}
            <path
              d="M 50 16 L 50 84 M 32 38 L 68 62 M 68 38 L 32 62"
              stroke="url(#bb-helix-2)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.35"
            />

            {/* Core Ascending Boost Rocket Arrow */}
            <path
              d="M 50 20 L 62 38 L 54 38 L 54 62 L 46 62 L 46 38 L 38 38 Z"
              fill="url(#bb-helix-2)"
              filter="url(#bb-helix-glow)"
            />

            {/* Orbiting Quantum Synapse Particle */}
            <circle cx="50" cy="20" r="4" fill="#ffffff" filter="url(#bb-helix-glow)">
              {animated && (
                <animate
                  attributeName="opacity"
                  values="0.6;1;0.6"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </svg>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VARIANT 3: CORTEX PRISM (Geometric Faceted AI Brain Gem)     */}
        {/* ------------------------------------------------------------- */}
        {activeStyle === 'prism' && (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full relative z-10 drop-shadow-sm transition-all duration-300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bb-prism-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id="bb-prism-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="bb-prism-grad-3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Faceted Geometric Brain Silhouette */}
            {/* Left Hemisphere Facets */}
            <polygon points="50,14 26,30 38,50 50,44" fill="url(#bb-prism-grad-1)" opacity="0.9" />
            <polygon points="26,30 18,52 34,68 38,50" fill="url(#bb-prism-grad-2)" opacity="0.8" />
            <polygon points="34,68 50,86 50,60 38,50" fill="url(#bb-prism-grad-1)" opacity="0.95" />

            {/* Right Hemisphere Facets */}
            <polygon points="50,14 74,30 62,50 50,44" fill="url(#bb-prism-grad-2)" opacity="0.9" />
            <polygon points="74,30 82,52 66,68 62,50" fill="url(#bb-prism-grad-3)" opacity="0.85" />
            <polygon points="66,68 50,86 50,60 62,50" fill="url(#bb-prism-grad-2)" opacity="0.95" />

            {/* Central Ascending Boost Spine & Apex Light Beam */}
            <line x1="50" y1="14" x2="50" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            <circle cx="50" cy="14" r="4" fill="#ffffff" className={animated ? 'animate-ping' : ''} />
            <circle cx="50" cy="14" r="3" fill="#38bdf8" />
          </svg>
        )}
      </div>

      {/* Typography: "Brainboost" with Balanced Proportions */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-tight text-slate-900 dark:text-white transition-colors duration-200 ${
                px <= 32 ? 'text-lg' : px <= 42 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
              } ${textClassName}`}
            >
              Brain
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent">
                boost
              </span>
            </span>

            {/* Micro AI Sparkle Badge */}
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
              AI
            </span>
          </div>

          {subtitle && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide mt-0.5 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
