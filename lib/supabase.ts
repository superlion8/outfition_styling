import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export type Category = 'tops' | 'bottoms' | 'onepiece' | 'accessories';

export interface WardrobeItemRow {
  id: string;
  user_id: string;
  category: Category;
  order_index: number;
  image_path: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      wardrobe_items: {
        Row: WardrobeItemRow;
        Insert: Omit<WardrobeItemRow, 'id' | 'created_at'>;
        Update: Partial<Omit<WardrobeItemRow, 'id' | 'created_at'>>;
      };
    };
  };
}

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

// Create Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Helper: Get or create anonymous user ID (stored in localStorage)
const USER_ID_KEY = 'outfition_user_id';

export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `anon_${crypto.randomUUID()}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Storage bucket name
export const WARDROBE_BUCKET = 'wardrobe';

// Helper: Get public URL for a storage path
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(WARDROBE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
