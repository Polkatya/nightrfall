// Client-side image compression before upload. Videos are left untouched
// (real video compression needs ffmpeg-wasm or similar, too heavy for the
// browser here) — this only shrinks photos.
//
// Downscales to a max dimension and re-encodes as JPEG at a fixed quality.
// If the compressed result somehow ends up bigger than the original (can
// happen with already-tiny or already-compressed files), the original is
// kept instead.

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  // PNGs are sometimes uploaded specifically for transparency; re-encoding
  // as JPEG would silently break that, so only touch JPEG/WebP originals.
  if (file.type === 'image/png') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );

    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    // If decoding fails for any reason, fall back to the original file
    // rather than blocking the upload.
    return file;
  }
}
