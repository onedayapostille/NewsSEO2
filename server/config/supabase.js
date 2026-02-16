import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple possible locations
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Track if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured - database features will be unavailable');
  console.warn('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
} else {
  console.log('✅ Supabase configuration found');
}

// Create client (or null client if not configured)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper to check if database is available
export const checkDatabaseAvailable = async () => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('websites').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};
