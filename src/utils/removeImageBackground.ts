import { removeBackground } from '@imgly/background-removal';

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function prepareSourceBlob(src: string, maxDim = 1600): Promise<Blob> {
  const img = await loadHtmlImage(src);
  const origW = img.naturalWidth || img.width || 1;
  const origH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const res = await fetch(src);
    return res.blob();
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode source image'));
      },
      'image/png',
      1
    );
  });
}

function refineAlphaAndTrimCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let a = data[idx + 3];

      if (a <= 14) {
        data[idx + 3] = 0;
        continue;
      }

      if (a >= 244) {
        a = 255;
        data[idx + 3] = 255;
      } else {
        // Gentle S-curve contrast on semi-transparent edges to eliminate halo haze
        const t = (a - 14) / (244 - 14);
        const sharpened = t * t * (3 - 2 * t);
        a = Math.round(sharpened * 255);
        data[idx + 3] = a;
      }

      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (maxX < minX || maxY < minY) {
    return canvas.toDataURL('image/png');
  }

  const pad = 4;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);

  const trimmed = document.createElement('canvas');
  trimmed.width = sw;
  trimmed.height = sh;
  const tCtx = trimmed.getContext('2d');
  if (!tCtx) return canvas.toDataURL('image/png');

  tCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return trimmed.toDataURL('image/png');
}

/**
 * High-accuracy perceptual edge flood-fill background removal.
 * Ideal for flat/studio backgrounds, logos, and clean cutouts, and acts as an instant offline fallback.
 */
export async function removeSolidBackgroundPerceptual(
  src: string,
  tolerance = 36
): Promise<string> {
  const img = await loadHtmlImage(src);
  const maxDim = 1600;
  const origW = img.naturalWidth || img.width || 1;
  const origH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const width = Math.max(1, Math.round(origW * scale));
  const height = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;

  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample perimeter pixels to estimate dominant background color
  const samples: Array<[number, number, number]> = [];
  const stepX = Math.max(1, Math.floor(width / 40));
  const stepY = Math.max(1, Math.floor(height / 40));

  for (let x = 0; x < width; x += stepX) {
    const topIdx = x * 4;
    if (data[topIdx + 3] > 200) samples.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
    const botIdx = ((height - 1) * width + x) * 4;
    if (data[botIdx + 3] > 200) samples.push([data[botIdx], data[botIdx + 1], data[botIdx + 2]]);
  }
  for (let y = 0; y < height; y += stepY) {
    const leftIdx = y * width * 4;
    if (data[leftIdx + 3] > 200) samples.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
    const rightIdx = (y * width + (width - 1)) * 4;
    if (data[rightIdx + 3] > 200) samples.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
  }

  if (samples.length === 0) {
    return refineAlphaAndTrimCanvas(canvas);
  }

  // Compute median RGB from border samples for robustness against corners with objects
  const rs = samples.map((s) => s[0]).sort((a, b) => a - b);
  const gs = samples.map((s) => s[1]).sort((a, b) => a - b);
  const bs = samples.map((s) => s[2]).sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  const bgR = rs[mid];
  const bgG = gs[mid];
  const bgB = bs[mid];

  const colorDist = (r: number, g: number, b: number) => {
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const rMean = (r + bgR) * 0.5;
    return Math.sqrt(
      (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db
    ) * 0.45;
  };

  const total = width * height;
  const visited = new Uint8Array(total);
  const bgMask = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const hardThreshold = tolerance;
  const softThreshold = tolerance + 22;

  const tryPush = (x: number, y: number) => {
    const pos = y * width + x;
    if (visited[pos]) return;
    visited[pos] = 1;
    const idx = pos * 4;
    if (data[idx + 3] <= 12) {
      bgMask[pos] = 1;
      queue[tail++] = pos;
      return;
    }
    const dist = colorDist(data[idx], data[idx + 1], data[idx + 2]);
    if (dist <= hardThreshold) {
      bgMask[pos] = 1;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (head < tail) {
    const pos = queue[head++];
    const x = pos % width;
    const y = (pos - x) / width;

    if (x > 0) tryPush(x - 1, y);
    if (x + 1 < width) tryPush(x + 1, y);
    if (y > 0) tryPush(x, y - 1);
    if (y + 1 < height) tryPush(x, y + 1);
  }

  // Apply transparent alpha and smooth edge feathering on neighbors of removed background
  for (let pos = 0; pos < total; pos++) {
    const idx = pos * 4;
    if (bgMask[pos]) {
      data[idx + 3] = 0;
      continue;
    }

    const x = pos % width;
    const y = (pos - x) / width;
    const touchesBg =
      (x > 0 && bgMask[pos - 1] === 1) ||
      (x + 1 < width && bgMask[pos + 1] === 1) ||
      (y > 0 && bgMask[pos - width] === 1) ||
      (y + 1 < height && bgMask[pos + width] === 1);

    if (touchesBg) {
      const dist = colorDist(data[idx], data[idx + 1], data[idx + 2]);
      if (dist < softThreshold) {
        const ratio = Math.max(0, Math.min(1, (dist - hardThreshold * 0.65) / (softThreshold - hardThreshold * 0.65)));
        data[idx + 3] = Math.round(data[idx + 3] * ratio);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return refineAlphaAndTrimCanvas(canvas);
}

/**
 * High-accuracy neural background removal (IS-Net FP16) with edge refinement,
 * transparent padding trim, and automatic perceptual fallback if offline.
 */
export async function removeImageBackgroundHighAccuracy(
  src: string,
  onProgress?: (percent: number) => void
): Promise<{ src: string; method: 'neural' | 'perceptual' }> {
  try {
    onProgress?.(5);
    const sourceBlob = await prepareSourceBlob(src, 1600);
    onProgress?.(15);

    const resultBlob = await removeBackground(sourceBlob, {
      model: 'isnet_fp16',
      proxyToWorker: false,
      output: {
        format: 'image/png',
        quality: 1,
      },
      progress: (_key: string, current: number, total: number) => {
        if (total > 0) {
          const pct = Math.min(94, Math.max(15, Math.round(15 + (current / total) * 79)));
          onProgress?.(pct);
        }
      },
    });

    const blobUrl = URL.createObjectURL(resultBlob);
    try {
      const img = await loadHtmlImage(blobUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.drawImage(img, 0, 0);

      onProgress?.(98);
      const refinedDataUrl = refineAlphaAndTrimCanvas(canvas);
      onProgress?.(100);
      return { src: refinedDataUrl, method: 'neural' };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    // Graceful high-accuracy perceptual fallback if network/WASM assets are unavailable
    onProgress?.(60);
    const fallbackDataUrl = await removeSolidBackgroundPerceptual(src, 38);
    onProgress?.(100);
    return { src: fallbackDataUrl, method: 'perceptual' };
  }
}
