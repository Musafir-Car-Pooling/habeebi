export const PHOTO_MAX_BYTES = 80 * 1024;
export const PHOTO_MAX_EDGE = 320;

export async function compressPhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) {
    throw new Error("photoInvalid");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const size = Math.min(PHOTO_MAX_EDGE, image.naturalWidth, image.naturalHeight);
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("photoInvalid");
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, size, size);
    for (const quality of [0.72, 0.55, 0.38]) {
      let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob?.type !== "image/webp") blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= PHOTO_MAX_BYTES) return blob;
    }
    throw new Error("photoInvalid");
  } finally { URL.revokeObjectURL(url); }
}