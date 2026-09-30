import React from 'react';

interface GameOnLogoProps {
  /**
   * The visual layout variant.
   * - 'icon': Just the circular vector emblem (ideal for headers, navs, and small buttons).
   * - 'app-icon': The emblem housed in a rounded squircle card with drop shadows.
   */
  variant?: 'icon' | 'app-icon';
  /** Diameter or width of the logo component */
  size?: number | string;
  className?: string;
}

export default function GameOnLogo({
  variant = 'icon',
  size = 40,
  className = '',
}: GameOnLogoProps) {
  // Read from index.html configuration, or default to a sporty logo
  const logoUrl = (window as any).GAMEON_BRAND_LOGO || "https://img.icons8.com/color/512/sports.png";

  // SVG inner contents representing the circular badge
  const renderBadge = () => (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full select-none overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradients */}
        <radialGradient id="badgeBg" cx="50%" cy="50%" r="50%" fx="40%" fy="40%">
          <stop offset="0%" stopColor="#22c55e" /> {/* vibrant green */}
          <stop offset="60%" stopColor="#15803d" /> {/* medium green */}
          <stop offset="100%" stopColor="#14532d" /> {/* dark forest green */}
        </radialGradient>

        <linearGradient id="glowRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" /> {/* neon highlight */}
          <stop offset="50%" stopColor="#166534" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>

        <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bef264" /> {/* yellow-green */}
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>

        {/* Shadow Filters for high-fidelity depth */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#042f1a" floodOpacity="0.4" />
        </filter>

        <filter id="textOuterGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#022c22" floodOpacity="0.8" />
        </filter>

        {/* Text Arc Path: perfect circle arch around (100, 112) with radius 66 */}
        {/* Sweeps clockwise from left (X: 34, Y: 112) up to right (X: 166, Y: 112) */}
        <path id="gameOnArcPath" d="M 34 116 A 66 66 0 0 1 166 116" fill="none" />
      </defs>

      {/* 1. Outer Glow Ring */}
      <circle cx="100" cy="100" r="88" fill="none" stroke="url(#glowRingGrad)" strokeWidth="4" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.6" />

      {/* 2. Primary Circular Badge Background */}
      <circle cx="100" cy="100" r="82" fill="url(#badgeBg)" filter="url(#logoShadow)" />

      {/* 3. Subtle background details - glowing spark dots & pitch lines */}
      <circle cx="60" cy="70" r="2" fill="#bef264" opacity="0.8" />
      <circle cx="78" cy="62" r="1.5" fill="#ffffff" opacity="0.6" />
      <circle cx="132" cy="72" r="2.5" fill="#bef264" opacity="0.7" />
      <circle cx="120" cy="84" r="1.5" fill="#ffffff" opacity="0.5" />
      <circle cx="70" cy="105" r="2" fill="#bef264" opacity="0.5" />
      
      {/* Background field arc (representing soccer field boundary) */}
      <path d="M 30 115 Q 100 90 170 115" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.35" />
      <path d="M 24 135 Q 100 110 176 135" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.25" />

      {/* 4. Dynamic Swoosh / Motion Kick Trail (from bottom-left sweeping up) */}
      <path
        d="M 35 152 C 45 130, 70 115, 96 118 C 80 124, 60 138, 52 158 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      <path
        d="M 42 162 C 55 142, 85 125, 114 130 C 95 136, 72 152, 60 172 Z"
        fill="#bbf7d0"
        opacity="0.75"
      />

      {/* 5. Star Sparks */}
      <path d="M 36 82 Q 40 82 40 78 Q 40 82 44 82 Q 40 82 40 86 Q 40 82 36 82 Z" fill="#ffffff" />
      <path d="M 164 102 Q 166 102 166 100 Q 166 102 168 102 Q 166 102 166 104 Q 166 102 164 102 Z" fill="#bef264" />

      {/* 6. Energetic Lightning Bolts / Sparks on the right */}
      <g filter="url(#logoShadow)">
        <path
          d="M 144 95 L 168 112 L 154 116 L 174 134 L 142 122 L 150 116 Z"
          fill="url(#lightningGrad)"
        />
        <path
          d="M 136 128 L 154 140 L 144 143 L 158 156 L 134 146 L 140 142 Z"
          fill="#bef264"
          opacity="0.9"
        />
      </g>

      {/* 7. Arched "FOOTBALL UNITED" Text with Sporty Double-Outline Style */}
      {/* Layer A: Huge dark forest green shadow outline */}
      <text
        fontFamily="system-ui, -apple-system, 'Space Grotesk', 'Impact', sans-serif"
        fontWeight="900"
        fontSize="13"
        letterSpacing="0.6px"
        fill="#022c22"
        stroke="#022c22"
        strokeWidth="5"
        strokeLinejoin="round"
      >
        <textPath href="#gameOnArcPath" startOffset="50%" textAnchor="middle">
          FOOTBALL UNITED
        </textPath>
      </text>

      {/* Layer B: Crisp white outline */}
      <text
        fontFamily="system-ui, -apple-system, 'Space Grotesk', 'Impact', sans-serif"
        fontWeight="900"
        fontSize="13"
        letterSpacing="0.6px"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        <textPath href="#gameOnArcPath" startOffset="50%" textAnchor="middle">
          FOOTBALL UNITED
        </textPath>
      </text>

      {/* Layer C: Clean solid sporty fill (with a slight green tint) */}
      <text
        fontFamily="system-ui, -apple-system, 'Space Grotesk', 'Impact', sans-serif"
        fontWeight="900"
        fontSize="13"
        letterSpacing="0.6px"
        fill="#ffffff"
        filter="url(#textOuterGlow)"
      >
        <textPath href="#gameOnArcPath" startOffset="50%" textAnchor="middle">
          FOOTBALL UNITED
        </textPath>
      </text>

      {/* 8. Fully Detailed Soccer Ball (positioned in center-bottom) */}
      <g filter="url(#logoShadow)" transform="translate(10, 5)">
        {/* Base white sphere */}
        <circle cx="95" cy="115" r="28" fill="#ffffff" stroke="#052e16" strokeWidth="2" />
        
        {/* Dynamic speed motion curves on the ball */}
        <path d="M 70 100 Q 82 92 98 102" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4" />
        
        {/* Inner Panel Patches (Pentagons & Hexagons) */}
        {/* Center-Top Pentagon */}
        <polygon points="95,103 105,110 101,121 89,121 85,110" fill="#052e16" />
        
        {/* Surrounding Lines & Partial Corner Patches */}
        <line x1="95" y1="103" x2="95" y2="91" stroke="#052e16" strokeWidth="2.5" />
        <line x1="105" y1="110" x2="117" y2="106" stroke="#052e16" strokeWidth="2.5" />
        <line x1="101" y1="121" x2="111" y2="131" stroke="#052e16" strokeWidth="2.5" />
        <line x1="89" y1="121" x2="79" y2="131" stroke="#052e16" strokeWidth="2.5" />
        <line x1="85" y1="110" x2="73" y2="106" stroke="#052e16" strokeWidth="2.5" />

        {/* Bottom edge panel */}
        <polygon points="88,135 102,135 95,143" fill="#052e16" />
        <line x1="88" y1="135" x2="79" y2="131" stroke="#052e16" strokeWidth="2.5" />
        <line x1="102" y1="135" x2="111" y2="131" stroke="#052e16" strokeWidth="2.5" />

        {/* Top-Left panel */}
        <polygon points="76,96 85,93 85,102 73,106" fill="#052e16" />
        
        {/* Top-Right panel */}
        <polygon points="114,96 105,93 105,102 117,106" fill="#052e16" />

        {/* Shading/glare curve overlay */}
        <path
          d="M 68 110 A 27 27 0 0 1 122 110 A 27 27 0 0 0 68 110 Z"
          fill="#ffffff"
          opacity="0.15"
        />
      </g>
    </svg>
  );

  // If app-icon variant, wrap inside a high-contrast squircle card
  if (variant === 'app-icon') {
    return (
      <div
        id="gameon-app-icon-container"
        className={`relative flex items-center justify-center bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950 rounded-[28%] shadow-lg border border-emerald-500/20 transition-all duration-300 p-0 overflow-hidden group-hover:scale-105 group-hover:shadow-xl ${className}`}
        style={{
          width: size,
          height: size,
        }}
      >
        <div className="w-full h-full relative flex items-center justify-center">
          {renderBadge()}
        </div>
      </div>
    );
  }

  // Standard raw logo
  return (
    <div
      id="gameon-raw-logo-container"
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {renderBadge()}
    </div>
  );
}
