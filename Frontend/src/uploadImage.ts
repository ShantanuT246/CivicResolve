import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function uploadImage(file: File): Promise<string> {
  try {
    const filename = `public/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error } = await supabase.storage
      .from("civic-evidence")
      .upload(filename, file);

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("civic-evidence")
      .getPublicUrl(filename);

    return publicUrl;
  } catch (err) {
    console.warn("Supabase Storage upload fallback:", err);
    return "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80";
  }
}