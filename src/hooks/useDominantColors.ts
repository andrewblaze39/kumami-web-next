'use client';

import { useState, useEffect } from 'react';

// Convert RGB to HSL, return saturation (0–1)
function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// Extract dominant vibrant color from an image URL via canvas sampling.
// Falls back to `fallback` if image can't be read or has no vibrant pixels.
async function extractDominantColor(
  url: string,
  fallback: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(fallback); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue; // skip transparent
          const sat = rgbSaturation(r, g, b);
          const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
          // Skip near-white, near-black, and low-saturation (grey) pixels
          if (sat < 0.25 || lightness < 0.1 || lightness > 0.92) continue;
          rSum += r; gSum += g; bSum += b; count++;
        }

        if (count === 0) { resolve(fallback); return; }
        const r = Math.round(rSum / count);
        const g = Math.round(gSum / count);
        const b = Math.round(bSum / count);
        resolve(`rgb(${r},${g},${b})`);
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = url;
  });
}

const FALLBACK = '#96EDD6';

/**
 * Given an array of logo URLs (parallel to portfolio items),
 * returns an array of hex/rgb colors — one per coin — extracted
 * from each logo's dominant vibrant color.
 *
 * Colors are extracted once per URL and cached in a module-level map
 * so re-renders don't re-sample.
 */
const cache = new Map<string, string>();

export function useDominantColors(logoUrls: (string | null)[]): string[] {
  const [colors, setColors] = useState<string[]>(() =>
    logoUrls.map((url) => (url && cache.has(url) ? cache.get(url)! : FALLBACK))
  );

  useEffect(() => {
    let cancelled = false;
    const key = logoUrls.join('|');

    async function run() {
      const resolved = await Promise.all(
        logoUrls.map(async (url) => {
          if (!url) return FALLBACK;
          if (cache.has(url)) return cache.get(url)!;
          const color = await extractDominantColor(url, FALLBACK);
          cache.set(url, color);
          return color;
        })
      );
      if (!cancelled) setColors(resolved);
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrls.join('|')]);

  return colors;
}
