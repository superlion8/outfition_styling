export enum AppView {
  CANVAS = 'CANVAS',
  SCANNING = 'SCANNING',
  LOADING = 'LOADING',
  RESULTS = 'RESULTS'
}

export type Category = 'tops' | 'bottoms' | 'onepiece' | 'accessories';

export interface WardrobeItem {
  id: string;
  category: Category;
  imageUrl: string;
  image_path: string; // From Supabase
  order_index: number; // From Supabase
  name: string;
}

export interface Outfit {
  id: string;
  items: {
    [key in Category]?: WardrobeItem;
  };
}