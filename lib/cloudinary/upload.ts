import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Uploads a base64-encoded image string to Cloudinary.
 * Applies automatic WebP optimization.
 */
export async function uploadImage(base64Str: string, folderName = "dar_aljarrah/covers"): Promise<UploadResult> {
  try {
    const uploadResponse = await cloudinary.uploader.upload(base64Str, {
      folder: folderName,
      fetch_format: "auto",
      quality: "auto",
      // Apply resizing if needed, but keeping it flexible
    });

    return {
      secureUrl: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      width: uploadResponse.width,
      height: uploadResponse.height,
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("فشل رفع الصورة إلى خادم الصور");
  }
}

/**
 * Deletes an image from Cloudinary by its public ID.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    return false;
  }
}

export default cloudinary;
