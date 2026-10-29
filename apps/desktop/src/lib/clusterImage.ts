const MAX_FILE_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 128;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function readClusterImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPEG, or WebP image.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read that image."));
      element.src = objectUrl;
    });

    const scale = Math.max(
      OUTPUT_SIZE / image.naturalWidth,
      OUTPUT_SIZE / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(
      image,
      (OUTPUT_SIZE - width) / 2,
      (OUTPUT_SIZE - height) / 2,
      width,
      height,
    );
    return canvas.toDataURL("image/webp", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
