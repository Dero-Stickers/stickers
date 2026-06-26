/**
 * Ottimizza un'immagine scelta dall'utente prima dell'upload:
 * - ridimensiona mantenendo le proporzioni (lato lungo ≤ `maxSize`)
 * - converte in WebP compresso (fallback automatico al formato del browser)
 *
 * Obiettivo: file piccolo (tipicamente 30-120 KB) → Storage leggero e
 * visualizzazione veloce. Tutto nel browser, nessuna libreria esterna.
 */
export async function optimizeImage(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<Blob> {
  const maxSize = opts.maxSize ?? 600;
  const quality = opts.quality ?? 0.82;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode_failed"));
    el.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unsupported");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality),
  );
  if (!blob) throw new Error("encode_failed");
  return blob;
}
