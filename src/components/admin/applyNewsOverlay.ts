/**
 * Resizes an image to 1440×960, composites the Kumami news overlay on top,
 * and returns a WebP Blob at 85% quality — matching proses-overlay.bat exactly.
 */
export async function applyNewsOverlay(file: File): Promise<File> {
  const TARGET_W = 1440;
  const TARGET_H = 960;
  const QUALITY = 0.85;
  const OVERLAY_PATH = '/news-overlay.png';

  // Load source image
  const sourceBitmap = await createImageBitmap(file);

  // Load overlay
  const overlayRes = await fetch(OVERLAY_PATH);
  const overlayBlob = await overlayRes.blob();
  const overlayBitmap = await createImageBitmap(overlayBlob);

  // Draw on canvas
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext('2d')!;

  // Source image stretched to fill (matches ImageMagick -resize 1440x960!)
  ctx.drawImage(sourceBitmap, 0, 0, TARGET_W, TARGET_H);

  // Overlay composited on top at full canvas size
  ctx.drawImage(overlayBitmap, 0, 0, TARGET_W, TARGET_H);

  sourceBitmap.close();
  overlayBitmap.close();

  // Export as WebP
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Canvas export failed')); return; }
        const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
        resolve(new File([blob], name, { type: 'image/webp' }));
      },
      'image/webp',
      QUALITY
    );
  });
}
