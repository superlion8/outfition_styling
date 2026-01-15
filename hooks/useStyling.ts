import { useState, useCallback } from 'react';
import { getUserId } from '../lib/supabase';

interface OutfitItem {
    id: string;
    image_url: string;
    image_path: string; // Added for generate-look API
    order_index: number;
    category: string;
}

interface Outfit {
    top?: OutfitItem;
    bottom?: OutfitItem;
    onepiece?: OutfitItem;
    accessory?: OutfitItem;
    generated_look?: string; // Base64 image
}

interface StylingResult {
    success: boolean;
    outfits: Outfit[];
    metadata?: {
        requested_count: number;
        returned_count: number;
        items_used: {
            tops: number;
            bottoms: number;
            onepiece: number;
            accessories: number;
        };
    };
}

interface UseStylingReturn {
    outfits: Outfit[];
    isLoading: boolean;
    isGeneratingLook: boolean;
    error: string | null;
    generateOutfits: (outfitCount: number) => Promise<void>;
    generateLook: (outfitIndex: number, outfit: Outfit) => Promise<string | null>;
    clearOutfits: () => void;
}

export function useStyling(): UseStylingReturn {
    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingLook, setIsGeneratingLook] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateOutfits = useCallback(async (outfitCount: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const userId = getUserId();

            const response = await fetch('/api/styling', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    outfit_count: outfitCount
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate outfits');
            }

            const result: StylingResult = await response.json();

            if (result.success && result.outfits) {
                setOutfits(result.outfits);
            } else {
                throw new Error('Invalid response from styling API');
            }
        } catch (e) {
            console.error('Failed to generate outfits:', e);
            setError(e instanceof Error ? e.message : 'Failed to generate outfits');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generateLook = useCallback(async (outfitIndex: number, outfit: Outfit): Promise<string | null> => {
        setIsGeneratingLook(true);
        // Don't set global error for partial failure on one outfit

        try {
            // Extract items from outfit
            const items = [];
            if (outfit.top) items.push(outfit.top);
            if (outfit.bottom) items.push(outfit.bottom);
            if (outfit.onepiece) items.push(outfit.onepiece);
            if (outfit.accessory) items.push(outfit.accessory);

            const response = await fetch('/api/generate-look', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: items.map(item => ({
                        image_path: item.image_path,
                        category: item.category
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate look');
            }

            const result = await response.json();

            if (result.image) {
                // Don't update global outfits state to avoid resetting UI changes
                // Just return the image data
                return `data:image/jpeg;base64,${result.image}`;
            }
            return null;
        } catch (e) {
            console.error('Failed to generate look:', e);
            return null;
        } finally {
            setIsGeneratingLook(false);
        }
    }, []);

    const clearOutfits = useCallback(() => {
        setOutfits([]);
        setError(null);
    }, []);

    return {
        outfits,
        isLoading,
        isGeneratingLook,
        error,
        generateOutfits,
        generateLook,
        clearOutfits
    };
}
