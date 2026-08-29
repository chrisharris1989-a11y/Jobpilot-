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

  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "png";
  const path = `${userId}/logo.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
    cacheControl: "3600"
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteBusinessLogo(userId, logoUrl) {
  if (!userId) return;
  const path = logoUrl ? extractLogoPath(logoUrl) : null;
  if (!path || !path.startsWith(`${userId}/`)) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

function extractLogoPath(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
