export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  targetSizeKB?: number;
  initialQuality?: number;
  minimumQuality?: number;
  outputFormat?: "webp" | "jpeg" | "auto";
}

export interface CompressionResult {
  compressedImage: string;
  blob: Blob;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalWidth: number;
  originalHeight: number;
  compressedWidth: number;
  compressedHeight: number;
}

/**
 * Helper to convert canvas.toBlob to a Promise
 */
function toBlobAsync(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        mimeType,
        quality
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Converts a Blob to Base64 Data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Checks if browser supports WebP canvas export
 */
function checkWebPSupport(canvas: HTMLCanvasElement): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        resolve(Boolean(blob && blob.type === "image/webp"));
      }, "image/webp", 0.8);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Checks if original canvas image contains transparent pixels
 */
function checkHasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    // Step by 4 bytes (RGBA) checking alpha channel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
  } catch {
    // Ignore cross-origin / read errors
  }
  return false;
}

/**
 * Compress an image file adaptively with configurable quality and size targets.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions | number,
  maxHeightParam?: number,
  qualityParam?: number
): Promise<CompressionResult> {
  // Handle backwards-compatible legacy positional parameters
  let opts: CompressOptions = {};
  if (typeof options === "number") {
    opts = {
      maxWidth: options,
      maxHeight: maxHeightParam,
      initialQuality: qualityParam ?? 0.90,
    };
  } else if (options) {
    opts = options;
  }

  const maxWidth = opts.maxWidth ?? 1600;
  const maxHeight = opts.maxHeight ?? 1600;
  const targetSizeKB = opts.targetSizeKB ?? 250;
  const initialQuality = opts.initialQuality ?? 0.90;
  const minimumQuality = opts.minimumQuality ?? 0.70;
  const outputFormat = opts.outputFormat ?? "auto";

  let objectUrl: string | null = null;
  let img: HTMLImageElement | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    // 1. Create HTMLImageElement via object URL (performance: avoid reading base64 initially)
    objectUrl = URL.createObjectURL(file);
    img = new Image();
    
    await new Promise<void>((resolve, reject) => {
      if (!img) return reject(new Error("Image element not initialized"));
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = objectUrl!;
    });

    const originalWidth = img.width;
    const originalHeight = img.height;

    // 2. Calculate aspect-ratio preserved dimensions
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth || height > maxHeight) {
      if (width / height > maxWidth / maxHeight) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      } else {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    // 3. Setup canvas & quality settings
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D context from canvas");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    // 4. Determine transparency and WebP support
    const isTransparentType = /png|webp|gif|svg/i.test(file.type);
    const hasTransparency = isTransparentType && checkHasTransparency(ctx, width, height);
    const supportsWebP = await checkWebPSupport(canvas);

    let selectedMimeType = "image/jpeg";
    if (outputFormat === "webp") {
      selectedMimeType = supportsWebP ? "image/webp" : (hasTransparency ? "image/png" : "image/jpeg");
    } else if (outputFormat === "jpeg") {
      selectedMimeType = "image/jpeg";
    } else {
      // "auto"
      if (hasTransparency) {
        selectedMimeType = supportsWebP ? "image/webp" : "image/png";
      } else {
        selectedMimeType = supportsWebP ? "image/webp" : "image/jpeg";
      }
    }

    // 5. Adaptive Quality Compression Loop using canvas.toBlob()
    const targetSizeBytes = targetSizeKB * 1024;
    let currentQuality = initialQuality;
    let finalBlob: Blob | null = null;

    // For lossless formats like PNG, quality parameter is ignored by browser
    if (selectedMimeType === "image/png") {
      finalBlob = await toBlobAsync(canvas, selectedMimeType, 1.0);
    } else {
      while (currentQuality >= minimumQuality - 0.001) {
        const blob = await toBlobAsync(canvas, selectedMimeType, currentQuality);
        if (blob) {
          finalBlob = blob;
          if (blob.size <= targetSizeBytes) {
            break; // Standard target reached
          }
        }
        currentQuality = Math.round((currentQuality - 0.05) * 100) / 100;
      }
    }

    // Fallback if toBlob failed
    if (!finalBlob) {
      selectedMimeType = "image/jpeg";
      finalBlob = await toBlobAsync(canvas, selectedMimeType, minimumQuality);
    }

    if (!finalBlob) {
      throw new Error("Canvas compression to blob failed");
    }

    // 6. Convert to Base64 Data URL only at the very end for return value
    const compressedDataUrl = await blobToDataURL(finalBlob);

    const originalSize = file.size;
    const compressedSize = finalBlob.size;
    const compressionRatio = Number((compressedSize / (originalSize || 1)).toFixed(4));

    const result: CompressionResult = {
      compressedImage: compressedDataUrl,
      blob: finalBlob,
      mimeType: finalBlob.type || selectedMimeType,
      originalSize,
      compressedSize,
      compressionRatio,
      originalWidth,
      originalHeight,
      compressedWidth: width,
      compressedHeight: height,
    };

    // Attach custom toString for smooth backward compatibility if result is used as string
    Object.defineProperty(result, "toString", {
      value: () => compressedDataUrl,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    return result;
  } finally {
    // 7. Cleanup resources & Object URLs for garbage collection
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    if (img) {
      img.onload = null;
      img.onerror = null;
      img = null;
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}
