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
  name: string;
}

export interface Outfit {
  id: string;
  items: {
    [key in Category]?: WardrobeItem;
  };
}