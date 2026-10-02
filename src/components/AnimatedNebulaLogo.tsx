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
  const gradientId = `nebula-gradient-${rawId}`;
  const eyeGradientId = `nebula-eye-${rawId}`;

  const glow = intensity === 'soft'
    ? '0 0 8px rgba(34,211,238,.35), 0 0 16px rgba(99,102,241,.28)'
    : '0 0 12px rgba(34,211,238,.95), 0 0 26px rgba(99,102,241,.85), 0 0 42px rgba(217,70,239,.72)';

  return (
    <span
      className={`nebula-live-logo inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
      title={title}
    >
      <style>{`
        @keyframes nebulaEyeMotion {
          0%, 18%   { transform: translateX(0) scaleY(1); }
          24%, 34%  { transform: translateX(5px) scaleY(1); }
          40%, 48%  { transform: translateX(0) scaleY(1); }
          55%, 65%  { transform: translateX(-5px) scaleY(1); }
          71%, 79%  { transform: translateX(0) scaleY(1); }
          83%, 85%  { transform: translateX(0) scaleY(.08); }
          89%, 100% { transform: translateX(0) scaleY(1); }
        }

        @keyframes nebulaLogoPulse {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.018); }
        }

        .nebula-live-logo .nebula-eye-group {
          transform-box: view-box;
          transform-origin: 60px 47px;
          animation: nebulaEyeMotion 6s cubic-bezier(.4,0,.2,1) infinite;
        }

        .nebula-live-logo .nebula-svg {
          transform-origin: center;
          animation: nebulaLogoPulse 3.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .nebula-live-logo .nebula-eye-group,
          .nebula-live-logo .nebula-svg {
            animation: none !important;
          }
        }
      `}</style>

      <span
        className="relative inline-flex items-center justify-center w-full h-full"
        style={{
          borderRadius: '32%',
          boxShadow: glow,
        }}
      >
        <svg
          className="nebula-svg w-full h-full overflow-visible"
          viewBox="0 0 120 104"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id={gradientId} x1="18" y1="14" x2="101" y2="91" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#39d9ff" />
              <stop offset="35%" stopColor="#4f9fff" />
              <stop offset="68%" stopColor="#9a5cff" />
              <stop offset="100%" stopColor="#f07be9" />
            </linearGradient>
            <linearGradient id={eyeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="72%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#bff9ff" />
            </linearGradient>
          </defs>

          <path
            d="M21 47C21 25 38 14 59 14C78 14 97 22 105 37C113 52 108 65 95 73L88 91C85 99 76 101 71 92L66 82C57 84 45 83 37 79C27 74 21 63 21 47Z"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.22"
          />

          <path
            d="M21 47C21 25 38 14 59 14C78 14 97 22 105 37C113 52 108 65 95 73L88 91C85 99 76 101 71 92L66 82C57 84 45 83 37 79C27 74 21 63 21 47Z"
            fill="#05080d"
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
    </span>
  );
};

export default AnimatedNebulaLogo;
