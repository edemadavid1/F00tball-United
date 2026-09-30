import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG design for the Football United App Icon
// Theme: #0f172a (dark slate), white, subtle gold/emerald accent (#38bdf8 / #4ade80), classic football + crest
function getIconSvg(isMaskable = false) {
  // If maskable, safe zone is 80% (scale 0.74 in center so padding is 13%)
  const scale = isMaskable ? 0.74 : 0.88;
  const translate = (512 * (1 - scale)) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bg-grad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <!-- Ball lighting -->
    <radialGradient id="ball-grad" cx="38%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Full bleed background for all shapes and maskable safety -->
  <rect width="512" height="512" fill="url(#bg-grad)"/>

  <g transform="translate(${translate}, ${translate}) scale(${scale})">
    <!-- Outer Shield / Badge Ring -->
    <circle cx="256" cy="256" r="236" fill="#1e293b" stroke="#334155" stroke-width="4"/>
    <circle cx="256" cy="256" r="226" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.9"/>
    <circle cx="256" cy="256" r="218" fill="#0f172a"/>

    <!-- Decorative Perimeter Stars (7 left, 7 right) -->
    <g fill="#ffffff" opacity="0.85">
      <!-- Left side stars -->
      <polygon points="120,95 123,103 131,104 125,110 127,118 120,114 113,118 115,110 109,104 117,103" transform="scale(0.8) translate(20, 10)"/>
      <polygon points="76,148 79,156 87,157 81,163 83,171 76,167 69,171 71,163 65,157 73,156" transform="scale(0.8) translate(15, 20)"/>
      <polygon points="52,215 55,223 63,224 57,230 59,238 52,234 45,238 47,230 41,224 49,223" transform="scale(0.8) translate(10, 30)"/>
      <polygon points="52,297 55,305 63,306 57,312 59,320 52,316 45,320 47,312 41,306 49,305" transform="scale(0.8) translate(10, 40)"/>
      <polygon points="76,364 79,372 87,373 81,379 83,387 76,383 69,387 71,379 65,373 73,372" transform="scale(0.8) translate(15, 50)"/>
      
      <!-- Right side stars -->
      <polygon points="392,95 395,103 403,104 397,110 399,118 392,114 385,118 387,110 381,104 389,103" transform="scale(0.8) translate(100, 10)"/>
      <polygon points="436,148 439,156 447,157 441,163 443,171 436,167 429,171 431,163 425,157 433,156" transform="scale(0.8) translate(105, 20)"/>
      <polygon points="460,215 463,223 471,224 465,230 467,238 460,234 453,238 455,230 449,224 457,223" transform="scale(0.8) translate(110, 30)"/>
      <polygon points="460,297 463,305 471,306 465,312 467,320 460,316 453,320 455,312 449,306 457,305" transform="scale(0.8) translate(110, 40)"/>
      <polygon points="436,364 439,372 447,373 441,379 443,387 436,383 429,387 431,379 425,373 433,372" transform="scale(0.8) translate(105, 50)"/>
    </g>

    <!-- Centerpiece Football / Soccer Ball Graphic -->
    <g filter="url(#shadow)" transform="translate(256, 215)">
      <!-- Ball sphere -->
      <circle cx="0" cy="0" r="108" fill="url(#ball-grad)" stroke="#ffffff" stroke-width="3"/>

      <!-- Center Pentagon -->
      <polygon points="0,-42 40,-13 25,35 -25,35 -40,-13" fill="#0f172a"/>

      <!-- Pentagon outward seams & edge patches -->
      <!-- Top seam & patch -->
      <line x1="0" y1="-42" x2="0" y2="-76" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M -36,-102 L 0,-76 L 36,-102" fill="none" stroke="#0f172a" stroke-width="4.5"/>
      <path d="M -36,-102 Q 0,-108 36,-102" fill="#0f172a"/>

      <!-- Top Right seam & patch -->
      <line x1="40" y1="-13" x2="72" y2="-28" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 72,-28 L 98,-8 L 88,-48 Z" fill="#0f172a"/>

      <!-- Bottom Right seam & patch -->
      <line x1="25" y1="35" x2="55" y2="68" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 55,68 L 92,54 L 75,90 Z" fill="#0f172a"/>

      <!-- Bottom Left seam & patch -->
      <line x1="-25" y1="35" x2="-55" y2="68" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M -55,68 L -75,90 L -92,54 Z" fill="#0f172a"/>

      <!-- Top Left seam & patch -->
      <line x1="-40" y1="-13" x2="-72" y2="-28" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M -72,-28 L -88,-48 L -98,-8 Z" fill="#0f172a"/>

      <!-- Connecting perimeter lines -->
      <line x1="36" y1="-102" x2="88" y2="-48" stroke="#0f172a" stroke-width="4"/>
      <line x1="98" y1="-8" x2="92" y2="54" stroke="#0f172a" stroke-width="4"/>
      <line x1="75" y1="90" x2="0" y2="108" stroke="#0f172a" stroke-width="4"/>
      <line x1="0" y1="108" x2="-75" y2="90" stroke="#0f172a" stroke-width="4"/>
      <line x1="-92" y1="54" x2="-98" y2="-8" stroke="#0f172a" stroke-width="4"/>
      <line x1="-88" y1="-48" x2="-36" y2="-102" stroke="#0f172a" stroke-width="4"/>
    </g>

    <!-- Bold, Clean Club Typography: FOOTBALL UNITED (Clean Sans) -->
    <g fill="#ffffff" text-anchor="middle">
      <text x="256" y="375" 
            font-family="system-ui, -apple-system, 'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif" 
            font-size="34" 
            font-weight="900" 
            letter-spacing="5px">FOOTBALL</text>
      <text x="256" y="415" 
            font-family="system-ui, -apple-system, 'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif" 
            font-size="36" 
            font-weight="900" 
            letter-spacing="7px" 
            fill="#38bdf8">UNITED</text>
    </g>

    <!-- Bottom Accent Ribbon / Badge Detail -->
    <path d="M 200,436 L 256,442 L 312,436" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function generateIcons() {
  const dirs = [
    path.join(process.cwd(), 'public', 'icons'),
    path.join(process.cwd(), 'icons')
  ];

  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const standardSvg = Buffer.from(getIconSvg(false));
  const maskableSvg = Buffer.from(getIconSvg(true));

  const targets = [
    { name: 'icon-192.png', size: 192, svg: standardSvg },
    { name: 'icon-512.png', size: 512, svg: standardSvg },
    { name: 'icon-maskable-192.png', size: 192, svg: maskableSvg },
    { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg },
    { name: 'apple-touch-icon.png', size: 180, svg: standardSvg },
  ];

  for (const target of targets) {
    const pngBuffer = await sharp(target.svg)
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toBuffer();

    for (const dir of dirs) {
      fs.writeFileSync(path.join(dir, target.name), pngBuffer);
    }
    console.log(`Generated ${target.name} (${target.size}x${target.size})`);
  }

  // Also root apple-touch-icon.png and in public/
  const appleTouchBuf = await sharp(standardSvg)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(process.cwd(), 'public', 'apple-touch-icon.png'), appleTouchBuf);
  fs.writeFileSync(path.join(process.cwd(), 'apple-touch-icon.png'), appleTouchBuf);

  console.log('All PWA icon assets generated successfully!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
