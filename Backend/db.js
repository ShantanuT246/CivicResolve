import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env explicitly so this module works whether imported before or after dotenv/config
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
  console.error('⚠️  SUPABASE_SERVICE_KEY is missing or invalid! RLS will block all writes.');
  console.error('   Key loaded:', supabaseKey ? supabaseKey.slice(0, 20) + '...' : 'undefined');
} else {
  console.log('✅ Supabase service_role key loaded (bypasses RLS)');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
