import { receiptFileError } from "./receipt";

/**
 * Decode and re-encode a receipt photo to strip EXIF, embedded metadata and the
 * original filename. Returns a JPEG data URL that lives only in memory.
 */
export async function prepareReceiptImage(file: File): Promise<string> {
  const invalid = receiptFileError(file);
  if (invalid) throw new Error(invalid);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("Deze foto werkt niet. Kies een andere of vul het zelf in."); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 24000000) throw new Error("Deze foto werkt niet. Kies een andere of vul het zelf in.");
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Deze foto werkt niet. Kies een andere of vul het zelf in.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.9);
    canvas.width = 0; canvas.height = 0;
    return data;
  } finally {
    bitmap.close();
  }
}
