import React from 'react';

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
  const glowOpacity = intensity === 'soft' ? 0.45 : 0.75;

  return (
    <span
      className={`nebula-live-logo inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
      title={title}
    >
      <style>{`
        @keyframes nebulaEyesLive {
          0%, 18%  { transform: translateX(0) scaleY(1); }
          24%, 34% { transform: translateX(5px) scaleY(1); }
          40%, 48% { transform: translateX(0) scaleY(1); }
          55%, 65% { transform: translateX(-5px) scaleY(1); }
          71%, 78% { transform: translateX(0) scaleY(1); }
          82%, 84% { transform: translateX(0) scaleY(0.12); }
          88%, 100% { transform: translateX(0) scaleY(1); }
        }

        @keyframes nebulaGlowLive {
          0%, 100% { opacity: 0.42; transform: scale(0.98); }
          50% { opacity: 0.92; transform: scale(1.035); }
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

        .nebula-live-logo svg {
          animation: nebulaFloatLive 4.4s infinite ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .nebula-live-logo .nebula-eye-group,
          .nebula-live-logo .nebula-glow-ring,
          .nebula-live-logo svg {
            animation: none !important;
          }
        }
      `}</style>

      <svg
        viewBox="0 0 120 104"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="nebulaLogoGradient" x1="22" y1="16" x2="98" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38d6ff" />
            <stop offset="45%" stopColor="#5aa9ff" />
            <stop offset="70%" stopColor="#d75cff" />
            <stop offset="100%" stopColor="#ffd9eb" />
          </linearGradient>
          <linearGradient id="nebulaEyeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#f8ffff" />
            <stop offset="100%" stopColor="#aaf7ff" />
          </linearGradient>
          <filter id="nebulaLogoGlow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          className="nebula-glow-ring"
          d="M22 48C22 25 40 14 60 14C78 14 97 22 105 37C113 51 108 65 95 73L88 91C85 99 76 101 71 92L66 82C57 84 45 83 37 79C27 74 21 63 22 48Z"
          fill="none"
          stroke="url(#nebulaLogoGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={glowOpacity}
          filter="url(#nebulaLogoGlow)"
        />

        <path
          d="M22 48C22 25 40 14 60 14C78 14 97 22 105 37C113 51 108 65 95 73L88 91C85 99 76 101 71 92L66 82C57 84 45 83 37 79C27 74 21 63 22 48Z"
          fill="#06090f"
          stroke="url(#nebulaLogoGradient)"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g className="nebula-eye-group">
          <rect x="42" y="34" width="13" height="30" rx="6.5" fill="url(#nebulaEyeGradient)" />
          <rect x="65" y="34" width="13" height="30" rx="6.5" fill="url(#nebulaEyeGradient)" />
        </g>
      </svg>
    </span>
  );
};

export default AnimatedNebulaLogo;
