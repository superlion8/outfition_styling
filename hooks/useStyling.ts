import { useState, useCallback } from 'react';
import { getUserId } from '../lib/supabase';

interface OutfitItem {
    id: string;
    image_url: string;
    order_index: number;
}

interface Outfit {
    top?: OutfitItem;
    bottom?: OutfitItem;
    onepiece?: OutfitItem;
    accessory?: OutfitItem;
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
    error: string | null;
    generateOutfits: (outfitCount: number) => Promise<void>;
    clearOutfits: () => void;
}

export function useStyling(): UseStylingReturn {
    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

    const clearOutfits = useCallback(() => {
        setOutfits([]);
        setError(null);
    }, []);

    return {
        outfits,
        isLoading,
        error,
        generateOutfits,
        clearOutfits
    };
}
