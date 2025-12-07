import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Converts a relative image URL to a data URL (base64)
 * Works for images stored in the public/uploads directory
 */
export async function imageUrlToDataUrl(
  imageUrl: string | null | undefined
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    // If it's already a data URL, return as is
    if (imageUrl.startsWith("data:")) {
      return imageUrl;
    }

    // If it's an absolute URL (http/https), return as is (react-pdf can handle it)
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // If it's a relative path (starts with /), read from filesystem
    if (imageUrl.startsWith("/")) {
      // Remove leading slash and read from public directory
      const filePath = join(process.cwd(), "public", imageUrl.substring(1));
      
      try {
        const fileBuffer = await readFile(filePath);
        const mimeType = getMimeType(filePath);
        const base64 = fileBuffer.toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.warn(`Could not read image file: ${filePath}`, error);
        return null;
      }
    }

    // For other cases, try to construct absolute URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  } catch (error) {
    console.warn("Error converting image URL to data URL:", error);
    return null;
  }
}

/**
 * Gets MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return mimeTypes[ext || ""] || "image/jpeg";
}

