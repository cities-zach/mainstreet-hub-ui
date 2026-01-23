import { supabase } from "@/lib/supabaseClient";

const INVALID_FILENAME_CHARS = /[^a-zA-Z0-9._-]/g;

function sanitizeFileName(name = "file") {
  const trimmed = name.trim() || "file";
  return trimmed.replace(INVALID_FILENAME_CHARS, "_");
}

export async function uploadPublicFile({ bucket = "uploads", pathPrefix = "", file }) {
  if (!file) {
    throw new Error("No file provided");
  }

  const safeName = sanitizeFileName(file.name || "file");
  const prefix = pathPrefix ? pathPrefix.replace(/\/+$/, "") : "misc";
  const filePath = `${prefix}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    file_name: file.name || safeName,
    file_url: data?.publicUrl || "",
    mime_type: file.type || null,
    size: file.size || null,
    storage_path: filePath,
  };
}
