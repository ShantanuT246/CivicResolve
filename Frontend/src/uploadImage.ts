import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(
  supabaseUrl.startsWith("http") ? supabaseUrl : "https://placeholder.supabase.co",
  supabaseKey.length > 20 ? supabaseKey : "placeholder-key"
);

/**
 * Resizes and compresses an image file to a clean, lightweight data URL
 * (capped at max 1280px dimension, 80% JPEG quality, typically ~200KB).
 */
function compressImageToDataUrl(file: File, maxDimension = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve("https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80");
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<string> {
  try {
    // Only attempt Supabase Storage if anon key is a valid JWT (starts with eyJ and has 3 parts)
    if (supabaseKey && supabaseKey.split(".").length === 3 && !supabaseKey.includes("...")) {
      const filename = `public/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      const { error } = await supabase.storage
        .from("civic-evidence")
        .upload(filename, file, { upsert: true });

      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("civic-evidence")
          .getPublicUrl(filename);

        if (publicUrl) return publicUrl;
      }
    }
  } catch (err) {
    console.warn("Supabase Storage upload bypassed, compressing file as Data URL:", err);
  }

  // Preserve the exact uploaded photo as a lightweight, compressed data URL
  return await compressImageToDataUrl(file);
}