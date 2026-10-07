import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function uploadImage(file: File): Promise<string> {
  const filename = `public/${Date.now()}-${file.name}`;

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
}