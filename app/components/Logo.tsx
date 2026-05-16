export default function Logo({ size = 200 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <radialGradient id="radGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.15" />
        </filter>
        <filter id="innerGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes subtleRotate {
            from { transform: rotate(0deg); transform-origin: 100px 100px; }
            to { transform: rotate(360deg); transform-origin: 100px 100px; }
          }
          .logo-ring { animation: subtleRotate 20s linear infinite; }
        `}</style>
      </defs>

      {/* White background circle */}
      <circle cx="100" cy="100" r="98" fill="white" filter="url(#shadow)" />

      {/* Outer decorative ring - rotating */}
      <g className="logo-ring" opacity="0.6">
        <circle cx="100" cy="100" r="92" fill="none" stroke="url(#grad1)" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="url(#grad2)" strokeWidth="0.6" strokeDasharray="2,3" opacity="0.5" />
      </g>

      {/* Secondary ring */}
      <circle cx="100" cy="100" r="80" fill="none" stroke="url(#grad1)" strokeWidth="0.8" opacity="0.4" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="url(#grad2)" strokeWidth="0.6" opacity="0.3" strokeDasharray="3,4" />

      {/* Islamic geometric pattern - center hexagon */}
      <g filter="url(#innerGlow)" opacity="0.5">
        <polygon points="100,55 125,68 125,93 100,106 75,93 75,68" fill="url(#radGrad)" opacity="0.2" stroke="url(#grad1)" strokeWidth="1" />
      </g>

      {/* Left side - ascending bars with gradient */}
      <g filter="url(#innerGlow)">
        <rect x="45" y="118" width="8" height="24" fill="url(#grad1)" opacity="0.9" rx="1.5" />
        <rect x="58" y="105" width="8" height="37" fill="url(#grad1)" opacity="1" rx="1.5" />
        <rect x="71" y="88" width="8" height="54" fill="url(#grad1)" opacity="1" rx="1.5" />
        {/* Subtle accent lines */}
        <line x1="45" y1="118" x2="71" y2="88" stroke="url(#grad2)" strokeWidth="0.5" opacity="0.4" />
      </g>

      {/* Right side - checkmark with flourish */}
      <g filter="url(#innerGlow)">
        <path
          d="M 110 108 L 122 120 L 148 90"
          fill="none"
          stroke="url(#grad2)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="1"
        />
        {/* Checkmark accent dot */}
        <circle cx="122" cy="120" r="2.5" fill="url(#grad2)" opacity="0.7" />
      </g>

      {/* Central ornamental element */}
      <g opacity="0.5" filter="url(#innerGlow)">
        <circle cx="100" cy="100" r="5" fill="none" stroke="url(#grad1)" strokeWidth="1" />
        <circle cx="100" cy="100" r="8" fill="none" stroke="url(#grad2)" strokeWidth="0.8" opacity="0.6" />
        <circle cx="100" cy="100" r="2" fill="url(#grad1)" />
      </g>

      {/* Corner accent elements - geometric details */}
      <g opacity="0.7" filter="url(#innerGlow)">
        {/* Top left */}
        <circle cx="40" cy="40" r="1.5" fill="url(#grad1)" />
        <line x1="40" y1="40" x2="50" y2="40" stroke="url(#grad1)" strokeWidth="0.8" opacity="0.6" />
        <line x1="40" y1="40" x2="40" y2="50" stroke="url(#grad1)" strokeWidth="0.8" opacity="0.6" />

        {/* Top right */}
        <circle cx="160" cy="40" r="1.5" fill="url(#grad2)" />
        <line x1="160" y1="40" x2="150" y2="40" stroke="url(#grad2)" strokeWidth="0.8" opacity="0.6" />
        <line x1="160" y1="40" x2="160" y2="50" stroke="url(#grad2)" strokeWidth="0.8" opacity="0.6" />

        {/* Bottom left */}
        <circle cx="40" cy="160" r="1.5" fill="url(#grad2)" opacity="0.6" />

        {/* Bottom right */}
        <circle cx="160" cy="160" r="1.5" fill="url(#grad1)" opacity="0.6" />
      </g>

      {/* Subtle connecting lines */}
      <g opacity="0.2" filter="url(#innerGlow)">
        <path d="M 71 88 L 100 100 L 110 108" fill="none" stroke="url(#grad1)" strokeWidth="0.5" />
        <path d="M 58 105 L 100 100 L 122 120" fill="none" stroke="url(#grad2)" strokeWidth="0.5" />
      </g>

      {/* Inner decorative arc */}
      <g opacity="0.4" filter="url(#innerGlow)">
        <path d="M 75 75 Q 100 65 125 75" fill="none" stroke="url(#grad1)" strokeWidth="0.8" />
        <path d="M 75 125 Q 100 135 125 125" fill="none" stroke="url(#grad2)" strokeWidth="0.8" />
      </g>

      {/* Micro pattern - subtle detail */}
      <g opacity="0.3">
        <circle cx="65" cy="65" r="1" fill="url(#grad1)" />
        <circle cx="135" cy="65" r="1" fill="url(#grad2)" />
        <circle cx="65" cy="135" r="1" fill="url(#grad2)" />
        <circle cx="135" cy="135" r="1" fill="url(#grad1)" />
      </g>
    </svg>
  );
}
