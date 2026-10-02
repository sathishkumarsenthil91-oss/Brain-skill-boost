import React from 'react';
import { NEBULA_LOGO_ASSET } from '../data/nebulaLogoAsset';

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
  const glow = intensity === 'soft'
    ? '0 0 8px rgba(88,170,255,.32)'
    : '0 0 12px rgba(34,211,238,.85), 0 0 24px rgba(99,102,241,.75), 0 0 38px rgba(217,70,239,.55)';

  return (
    <span
      className={`nebula-live-logo relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-[26%] bg-[#03070d] ${className}`}
      style={{ width: size, height: size, boxShadow: glow }}
      role="img"
      aria-label={title}
      title={title}
    >
      <style>{`
        @keyframes nebulaOriginalEyes {
          0%, 18% { transform: translateX(0) scaleY(1); }
          24%, 34% { transform: translateX(7%) scaleY(1); }
          40%, 48% { transform: translateX(0) scaleY(1); }
          55%, 65% { transform: translateX(-7%) scaleY(1); }
          71%, 79% { transform: translateX(0) scaleY(1); }
          83%, 85% { transform: translateX(0) scaleY(.08); }
          89%, 100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes nebulaOriginalPulse {
          0%, 100% { transform: scale(1); filter: saturate(1) brightness(1); }
          50% { transform: scale(1.018); filter: saturate(1.06) brightness(1.05); }
        }
        .nebula-live-logo .nebula-original-image {
          animation: nebulaOriginalPulse 3.8s ease-in-out infinite;
        }
        .nebula-live-logo .nebula-original-eye-row {
          transform-origin: center;
          animation: nebulaOriginalEyes 6s cubic-bezier(.4,0,.2,1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .nebula-live-logo .nebula-original-image,
          .nebula-live-logo .nebula-original-eye-row {
            animation: none !important;
          }
        }
      `}</style>

      <img
        src={NEBULA_LOGO_ASSET}
        alt=""
        aria-hidden="true"
        className="nebula-original-image absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      {/* Cover the source eyes with the logo's native dark face, then redraw them for animation. */}
      <span
        className="absolute pointer-events-none"
        style={{
          left: '28.5%',
          top: '31.5%',
          width: '31.5%',
          height: '27%',
          borderRadius: '22%',
          background: 'linear-gradient(180deg, #070b10 0%, #07080c 75%, #081015 100%)',
        }}
      >
        <span className="nebula-original-eye-row absolute inset-0 flex items-center justify-center gap-[17%]">
          <span
            className="block h-[72%] w-[25%] rounded-full"
            style={{ background: 'linear-gradient(180deg,#fff 0%,#fff 60%,#c9fbff 100%)' }}
          />
          <span
            className="block h-[72%] w-[25%] rounded-full"
            style={{ background: 'linear-gradient(180deg,#fff 0%,#fff 60%,#c9fbff 100%)' }}
          />
        </span>
      </span>
    </span>
  );
};

export default AnimatedNebulaLogo;
