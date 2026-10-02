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
  const ringGradientId = `nebula-ring-gradient-${rawId}`;
  const coreGradientId = `nebula-core-gradient-${rawId}`;
  const eyeGradientId = `nebula-eye-gradient-${rawId}`;

  const outerGlow = intensity === 'soft'
    ? '0 0 8px rgba(56,214,255,.34), 0 0 16px rgba(90,169,255,.24)'
    : '0 0 10px rgba(56,214,255,.95), 0 0 24px rgba(90,169,255,.78), 0 0 42px rgba(215,92,255,.62)';

  return (
    <span
      className={`nebula-live-logo inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: outerGlow,
        background: '#050812',
      }}
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
          0%, 100% { opacity: .72; transform: scale(.985); }
          50% { opacity: 1; transform: scale(1.015); }
        }

        @keyframes nebulaFloatLive {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }

        .nebula-live-logo,
        .nebula-live-logo .nebula-svg {
          border-radius: 50% !important;
        }

        .nebula-live-logo .nebula-eye-group {
          transform-box: view-box;
          transform-origin: 60px 59px;
          animation: nebulaEyesLive 6s infinite cubic-bezier(.4,0,.2,1);
        }

        .nebula-live-logo .nebula-glow-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: nebulaGlowLive 3.2s infinite ease-in-out;
        }

        .nebula-live-logo .nebula-svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
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
        viewBox="0 0 120 120"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={ringGradientId} x1="18" y1="16" x2="104" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38d6ff" />
            <stop offset="42%" stopColor="#5aa9ff" />
            <stop offset="72%" stopColor="#d75cff" />
            <stop offset="100%" stopColor="#ff7bd5" />
          </linearGradient>

          <radialGradient id={coreGradientId} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#15203a" />
            <stop offset="55%" stopColor="#080d1c" />
            <stop offset="100%" stopColor="#03060d" />
          </radialGradient>

          <linearGradient id={eyeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f8ffff" />
            <stop offset="100%" stopColor="#aaf7ff" />
          </linearGradient>
        </defs>

        <circle cx="60" cy="60" r="60" fill="#050812" />

        <circle
          className="nebula-glow-ring"
          cx="60"
          cy="60"
          r="52"
          fill={`url(#${coreGradientId})`}
          stroke={`url(#${ringGradientId})`}
          strokeWidth="8"
        />

        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,.10)"
          strokeWidth="1.5"
        />

        <g className="nebula-eye-group">
          <rect x="41" y="44" width="13" height="30" rx="6.5" fill={`url(#${eyeGradientId})`} />
          <rect x="66" y="44" width="13" height="30" rx="6.5" fill={`url(#${eyeGradientId})`} />
        </g>
      </svg>
    </span>
  );
};

export default AnimatedNebulaLogo;
