import { supabase } from "../../supabase.js";

const BUCKET = "business-logos";
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]);

export async function uploadBusinessLogo(file, userId) {
  if (!file || !userId) throw new Error("A logo file and signed-in user are required.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Please choose a supported image file (JPG, PNG, WebP, GIF or SVG).");
  if (file.size > MAX_LOGO_SIZE) throw new Error("The logo must be 5 MB or smaller.");

  const path = `${userId}/logo`;
  const bucket = supabase.storage.from(BUCKET);

  const { error } = await bucket.upload(path, file, {
    contentType: file.type,
    upsert: true,
    cacheControl: "3600"
  });

  if (error) throw error;

  const { data } = bucket.getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteBusinessLogo(userId, logoUrl) {
  if (!userId) return;
  const path = logoUrl ? extractLogoPath(logoUrl) : `${userId}/logo`;
  if (!path || !path.startsWith(`${userId}/`)) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

function extractLogoPath(url) {
  const publicMarker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(publicMarker);
  if (index !== -1) return decodeURIComponent(url.slice(index + publicMarker.length));

  const signMarker = `/storage/v1/object/sign/${BUCKET}/`;
  const signIndex = url.indexOf(signMarker);
  if (signIndex !== -1) return decodeURIComponent(url.slice(signIndex + signMarker.length).split("?")[0]);

  return null;
}
