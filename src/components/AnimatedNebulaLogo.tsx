import React, { useId } from 'react';

interface AnimatedNebulaLogoProps {
  size?: number | string;
  className?: string;
  title?: string;
  intensity?: 'soft' | 'normal';
}

export const AnimatedNebulaLogo: React.FC<AnimatedNebulaLogoProps> = ({
  size = 40,
  className = '',
  title = 'Nebula AI',
  intensity = 'normal',
}) => {
  const rawId = useId().replace(/:/g, '');
  const gradientId = `nebula-logo-gradient-${rawId}`;
  const eyeGradientId = `nebula-eye-gradient-${rawId}`;

  const outerGlow = intensity === 'soft'
    ? '0 0 8px rgba(56,214,255,.30), 0 0 16px rgba(90,169,255,.22)'
    : '0 0 14px rgba(56,214,255,.88), 0 0 28px rgba(90,169,255,.72), 0 0 46px rgba(215,92,255,.58)';

  return (
    <span
      className={`nebula-live-logo inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, boxShadow: outerGlow, borderRadius: '32%' }}
      role="img"
      aria-label={title}
      title={title}
    >
      <style>{`
        @keyframes nebulaEyesLive {
          0%, 7%   { transform: translateX(0) scaleY(0.08); }
          12%, 29% { transform: translateX(0) scaleY(1); }
          36%, 44% { transform: translateX(5px) scaleY(1); }
          49%, 55% { transform: translateX(0) scaleY(1); }
          62%, 70% { transform: translateX(-5px) scaleY(1); }
          75%, 81% { transform: translateX(0) scaleY(1); }
          84%, 86% { transform: translateX(0) scaleY(0.08); }
          90%, 100% { transform: translateX(0) scaleY(1); }
        }

        @keyframes nebulaGlowLive {
          0%, 100% { opacity: 0.38; transform: scale(0.985); }
          50% { opacity: 0.95; transform: scale(1.04); }
        }

        @keyframes nebulaFloatLive {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }

        .nebula-live-logo .nebula-eye-group {
          transform-box: view-box;
          transform-origin: 60px 48px;
          animation: nebulaEyesLive 6s infinite cubic-bezier(.4,0,.2,1);
        }

        .nebula-live-logo .nebula-glow-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: nebulaGlowLive 3.2s infinite ease-in-out;
        }

        .nebula-live-logo .nebula-svg {
          transform-origin: center;
          animation: nebulaFloatLive 4.4s infinite ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .nebula-live-logo .nebula-eye-group,
          .nebula-live-logo .nebula-glow-ring,
          .nebula-live-logo .nebula-svg {
            animation: none !important;
          }
        }
      `}</style>

      <svg
        className="nebula-svg"
        viewBox="0 0 120 104"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="22" y1="16" x2="98" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38d6ff" />
            <stop offset="45%" stopColor="#5aa9ff" />
            <stop offset="70%" stopColor="#d75cff" />
            <stop offset="100%" stopColor="#ffd9eb" />
          </linearGradient>
          <linearGradient id={eyeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#f8ffff" />
            <stop offset="100%" stopColor="#aaf7ff" />
          </linearGradient>
        </defs>

        <path
          className="nebula-glow-ring"
          d="M22 48C22 25 40 14 60 14C78 14 97 22 105 37C113 51 108 65 95 73L88 91C85 99 76 101 71 92L66 82C57 84 45 83 37 79C27 74 21 63 22 48Z"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M22 48C22 25 40 14 60 14C78 14 97 22 105 37C113 51 108 65 95 73L88 91C85 99 76 101 71 92L66 82C57 84 45 83 37 79C27 74 21 63 22 48Z"
          fill="#06090f"
          stroke={`url(#${gradientId})`}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g className="nebula-eye-group">
          <rect x="42" y="34" width="13" height="30" rx="6.5" fill={`url(#${eyeGradientId})`} />
          <rect x="65" y="34" width="13" height="30" rx="6.5" fill={`url(#${eyeGradientId})`} />
        </g>
      </svg>
    </span>
  );
};

export default AnimatedNebulaLogo;
