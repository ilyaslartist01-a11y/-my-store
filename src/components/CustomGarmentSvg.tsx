import type { CustomGarmentType } from '../types';

export interface StudioArtworkLayer {
  id: string;
  side: 'front' | 'back';
  name: string;
  src: string;
  originalSrc?: string;
  bgRemoved?: boolean;
  /** Percentage of studio canvas width (0-100) */
  x: number;
  /** Percentage of studio canvas height (0-100) */
  y: number;
  /** Width in percentage of canvas width (8-70) */
  widthPct: number;
  /** Rotation in degrees (-180 to 180) */
  rotation: number;
  /** Opacity (0.2 to 1) */
  opacity: number;
}

interface CustomGarmentSvgProps {
  garmentType: CustomGarmentType;
  side: 'front' | 'back';
  colorHex: string;
  className?: string;
}

export function CustomGarmentSvg({
  garmentType,
  side,
  colorHex,
  className = 'h-full w-full',
}: CustomGarmentSvgProps) {
  if (garmentType === 'tshirt') {
    return (
      <svg
        viewBox="0 0 500 580"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={side === 'front' ? 'تصميم تيشيرت أمامي' : 'تصميم تيشيرت خلفي'}
      >
        <defs>
          <linearGradient id="tshirt-shading" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.24" />
          </linearGradient>
          <radialGradient id="tshirt-fold" cx="50%" cy="32%" r="58%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {/* Main T-Shirt Silhouette */}
        <path
          d={
            side === 'front'
              ? 'M 176 58 C 198 86, 302 86, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
              : 'M 176 58 C 204 70, 296 70, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
          }
          fill={colorHex}
          stroke="#000000"
          strokeOpacity="0.35"
          strokeWidth="2"
        />

        {/* Studio Fabric Lighting & Shading */}
        <path
          d={
            side === 'front'
              ? 'M 176 58 C 198 86, 302 86, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
              : 'M 176 58 C 204 70, 296 70, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
          }
          fill="url(#tshirt-shading)"
        />
        <path
          d={
            side === 'front'
              ? 'M 176 58 C 198 86, 302 86, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
              : 'M 176 58 C 204 70, 296 70, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
          }
          fill="url(#tshirt-fold)"
        />

        {/* Inner Neck Depth (Front only) */}
        {side === 'front' && (
          <path
            d="M 183 61 C 206 89, 294 89, 317 61 C 292 75, 208 75, 183 61 Z"
            fill="#000000"
            fillOpacity="0.28"
          />
        )}

        {/* Ribbed Collar Seam */}
        <path
          d={
            side === 'front'
              ? 'M 172 60 C 198 98, 302 98, 328 60'
              : 'M 174 60 C 204 78, 296 78, 326 60'
          }
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.16"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={
            side === 'front'
              ? 'M 170 63 C 198 102, 302 102, 330 63'
              : 'M 172 62 C 204 80, 296 80, 328 62'
          }
          fill="none"
          stroke="#000000"
          strokeOpacity="0.24"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />

        {/* Dropped Shoulder & Sleeve Seams */}
        <path
          d="M 132 72 L 132 206"
          fill="none"
          stroke="#000000"
          strokeOpacity="0.18"
          strokeWidth="1.6"
        />
        <path
          d="M 368 72 L 368 206"
          fill="none"
          stroke="#000000"
          strokeOpacity="0.18"
          strokeWidth="1.6"
        />
        <path
          d="M 34 170 L 86 234"
          fill="none"
          stroke="#000000"
          strokeOpacity="0.22"
          strokeWidth="1.4"
          strokeDasharray="3 3"
        />
        <path
          d="M 466 170 L 414 234"
          fill="none"
          stroke="#000000"
          strokeOpacity="0.22"
          strokeWidth="1.4"
          strokeDasharray="3 3"
        />

        {/* Bottom Hem Stitching */}
        <path
          d="M 134 522 L 366 522"
          fill="none"
          stroke="#000000"
          strokeOpacity="0.24"
          strokeWidth="1.4"
          strokeDasharray="3 3"
        />
        <path
          d="M 134 525 L 366 525"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 500 580"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={side === 'front' ? 'تصميم هودي أمامي' : 'تصميم هودي خلفي'}
    >
      <defs>
        <linearGradient id="hoodie-shading" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.14" />
          <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id="hoodie-fold" cx="50%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="72%" stopColor="#000000" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.24" />
        </radialGradient>
      </defs>

      {/* Hoodie Body & Sleeves */}
      <path
        d="M 178 106 L 118 118 L 48 292 L 38 408 L 88 418 L 122 252 L 130 506 L 134 544 L 366 544 L 370 506 L 378 252 L 412 418 L 462 408 L 452 292 L 382 118 L 322 106 Z"
        fill={colorHex}
        stroke="#000000"
        strokeOpacity="0.38"
        strokeWidth="2"
      />
      <path
        d="M 178 106 L 118 118 L 48 292 L 38 408 L 88 418 L 122 252 L 130 506 L 134 544 L 366 544 L 370 506 L 378 252 L 412 418 L 462 408 L 452 292 L 382 118 L 322 106 Z"
        fill="url(#hoodie-shading)"
      />
      <path
        d="M 178 106 L 118 118 L 48 292 L 38 408 L 88 418 L 122 252 L 130 506 L 134 544 L 366 544 L 370 506 L 378 252 L 412 418 L 462 408 L 452 292 L 382 118 L 322 106 Z"
        fill="url(#hoodie-fold)"
      />

      {/* Structured Double-Layered Hood */}
      {side === 'front' ? (
        <>
          <path
            d="M 178 108 C 172 64, 198 30, 250 30 C 302 30, 328 64, 322 108 C 296 136, 204 136, 178 108 Z"
            fill={colorHex}
            stroke="#000000"
            strokeOpacity="0.38"
            strokeWidth="2"
          />
          <path
            d="M 178 108 C 172 64, 198 30, 250 30 C 302 30, 328 64, 322 108 C 296 136, 204 136, 178 108 Z"
            fill="url(#hoodie-shading)"
          />
          {/* Inner Hood Shadow */}
          <path
            d="M 200 112 C 198 76, 218 52, 250 52 C 282 52, 302 76, 300 112 C 276 126, 224 126, 200 112 Z"
            fill="#000000"
            fillOpacity="0.36"
          />
          {/* Metal-Tipped Drawstrings */}
          <path
            d="M 225 122 Q 222 162 224 198"
            fill="none"
            stroke={colorHex}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 225 122 Q 222 162 224 198"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 275 122 Q 278 162 276 198"
            fill="none"
            stroke={colorHex}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 275 122 Q 278 162 276 198"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect x="221" y="195" width="6" height="10" rx="2" fill="#C6A87D" />
          <rect x="273" y="195" width="6" height="10" rx="2" fill="#C6A87D" />
        </>
      ) : (
        <>
          <path
            d="M 176 112 C 174 52, 204 28, 250 28 C 296 28, 326 52, 324 112 C 304 166, 196 166, 176 112 Z"
            fill={colorHex}
            stroke="#000000"
            strokeOpacity="0.38"
            strokeWidth="2"
          />
          <path
            d="M 176 112 C 174 52, 204 28, 250 28 C 296 28, 326 52, 324 112 C 304 166, 196 166, 176 112 Z"
            fill="url(#hoodie-shading)"
          />
          <path
            d="M 250 28 L 250 148"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.22"
            strokeWidth="1.6"
          />
        </>
      )}

      {/* Kangaroo Pocket (Front only) */}
      {side === 'front' && (
        <>
          <path
            d="M 176 382 L 324 382 L 344 486 L 156 486 Z"
            fill="#000000"
            fillOpacity="0.1"
            stroke="#000000"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <path
            d="M 176 382 L 156 486 M 324 382 L 344 486 M 180 385 L 320 385"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </>
      )}

      {/* Ribbed Waistband & Cuffs */}
      <rect
        x="133"
        y="506"
        width="234"
        height="38"
        fill="#000000"
        fillOpacity="0.14"
        stroke="#000000"
        strokeOpacity="0.24"
        strokeWidth="1.5"
      />
      <path
        d="M 42 384 L 91 395 L 88 418 L 38 408 Z"
        fill="#000000"
        fillOpacity="0.16"
        stroke="#000000"
        strokeOpacity="0.25"
        strokeWidth="1.2"
      />
      <path
        d="M 458 384 L 409 395 L 412 418 L 462 408 Z"
        fill="#000000"
        fillOpacity="0.16"
        stroke="#000000"
        strokeOpacity="0.25"
        strokeWidth="1.2"
      />

      {/* Shoulder Seams */}
      <path
        d="M 122 120 L 122 252"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <path
        d="M 378 120 L 378 252"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function buildSvgMarkup(
  garmentType: CustomGarmentType,
  side: 'front' | 'back',
  colorHex: string
): string {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex : '#141518';
  if (garmentType === 'tshirt') {
    const pathD =
      side === 'front'
        ? 'M 176 58 C 198 86, 302 86, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z'
        : 'M 176 58 C 204 70, 296 70, 324 58 L 368 72 L 474 162 L 420 242 L 368 206 L 368 528 C 368 534, 363 538, 357 538 L 143 538 C 137 538, 132 534, 132 528 L 132 206 L 80 242 L 26 162 L 132 72 Z';
    return `<svg viewBox="0 0 500 580" width="500" height="580" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="580" fill="#111215"/>
      <path d="${pathD}" fill="${safeHex}" stroke="#000000" stroke-opacity="0.35" stroke-width="2"/>
      <path d="${pathD}" fill="#000000" fill-opacity="0.08"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 500 580" width="500" height="580" xmlns="http://www.w3.org/2000/svg">
    <rect width="500" height="580" fill="#111215"/>
    <path d="M 178 106 L 118 118 L 48 292 L 38 408 L 88 418 L 122 252 L 130 506 L 134 544 L 366 544 L 370 506 L 378 252 L 412 418 L 462 408 L 452 292 L 382 118 L 322 106 Z" fill="${safeHex}" stroke="#000000" stroke-opacity="0.38" stroke-width="2"/>
    <path d="M 178 108 C 172 64, 198 30, 250 30 C 302 30, 328 64, 322 108 C 296 136, 204 136, 178 108 Z" fill="${safeHex}" stroke="#000000" stroke-opacity="0.38" stroke-width="2"/>
    ${side === 'front' ? '<path d="M 176 382 L 324 382 L 344 486 L 156 486 Z" fill="#000000" fill-opacity="0.14"/>' : ''}
  </svg>`;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderCustomGarmentPreview(
  garmentType: CustomGarmentType,
  side: 'front' | 'back',
  colorHex: string,
  layers: StudioArtworkLayer[]
): Promise<string> {
  const width = 400;
  const height = 464;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const svgMarkup = buildSvgMarkup(garmentType, side, colorHex);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

  try {
    const baseImg = await loadImg(svgUrl);
    ctx.drawImage(baseImg, 0, 0, width, height);
  } catch {
    ctx.fillStyle = '#111215';
    ctx.fillRect(0, 0, width, height);
  }

  const visibleLayers = layers.filter((l) => l.side === side);
  for (const layer of visibleLayers) {
    try {
      const artImg = await loadImg(layer.src);
      const drawW = (layer.widthPct / 100) * width;
      const ratio = artImg.naturalHeight > 0 ? artImg.naturalHeight / artImg.naturalWidth : 1;
      const drawH = drawW * ratio;
      const cx = (layer.x / 100) * width;
      const cy = (layer.y / 100) * height;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(artImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } catch {
      // Skip layer if image failed to load
    }
  }

  return canvas.toDataURL('image/jpeg', 0.84);
}
