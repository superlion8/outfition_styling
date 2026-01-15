import { useState, useCallback, useEffect } from 'react';
import { supabase, getUserId, getPublicUrl, WARDROBE_BUCKET, type Category, type WardrobeItemRow } from '../lib/supabase';
import type { WardrobeItem } from '../types';

interface UseWardrobeReturn {
    items: WardrobeItem[];
    isLoading: boolean;
    error: string | null;
    uploadItems: (files: FileList | null, category: Category) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    moveItem: (itemId: string, newCategory: Category) => Promise<void>;
    refreshItems: () => Promise<void>;
}

// Convert database row to frontend WardrobeItem
function toWardrobeItem(row: WardrobeItemRow): WardrobeItem {
    return {
        id: row.id,
        category: row.category,
        imageUrl: getPublicUrl(row.image_path),
        name: `${row.category} #${row.order_index}`
    };
}

export function useWardrobe(): UseWardrobeReturn {
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = getUserId();

    // Fetch items from database
    const refreshItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('wardrobe_items')
                .select('*')
                .eq('user_id', userId)
                .order('category')
                .order('order_index');

            if (fetchError) throw fetchError;

            setItems((data || []).map(toWardrobeItem));
        } catch (e) {
            console.error('Failed to fetch wardrobe items:', e);
            setError(e instanceof Error ? e.message : 'Failed to fetch items');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Load items on mount
    useEffect(() => {
        refreshItems();
    }, [refreshItems]);

    // Upload files to storage and create database records
    const uploadItems = useCallback(async (files: FileList | null, category: Category) => {
        if (!files || files.length === 0) return;

        setError(null);

        try {
            // Get current max order_index for this category
            const { data: existingItems } = await supabase
                .from('wardrobe_items')
                .select('order_index')
                .eq('user_id', userId)
                .eq('category', category)
                .order('order_index', { ascending: false })
                .limit(1);

            let nextOrderIndex = (existingItems?.[0]?.order_index || 0) + 1;

            // Upload each file
            for (const file of Array.from(files)) {
                const fileExt = file.name.split('.').pop() || 'jpg';
                const fileName = `${userId}/${category}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                // Upload to storage
                const { error: uploadError } = await supabase.storage
                    .from(WARDROBE_BUCKET)
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw uploadError;
                }

                // Insert database record
                const { error: insertError } = await supabase
                    .from('wardrobe_items')
                    .insert({
                        user_id: userId,
                        category: category,
                        order_index: nextOrderIndex,
                        image_path: fileName
                    });

                if (insertError) {
                    console.error('Insert error:', insertError);
                    throw insertError;
                }

                nextOrderIndex++;
            }

            // Refresh the items list
            await refreshItems();
        } catch (e) {
            console.error('Failed to upload items:', e);
            setError(e instanceof Error ? e.message : 'Failed to upload items');
        }
    }, [userId, refreshItems]);

    // Delete an item
    const deleteItem = useCallback(async (itemId: string) => {
        setError(null);

        try {
            // Get the item first to find its storage path
            const { data: item } = await supabase
                .from('wardrobe_items')
                .select('image_path')
                .eq('id', itemId)
                .single();

            if (item) {
                // Delete from storage
                await supabase.storage
                    .from(WARDROBE_BUCKET)
                    .remove([item.image_path]);
            }

            // Delete from database
            const { error: deleteError } = await supabase
                .from('wardrobe_items')
                .delete()
                .eq('id', itemId);

            if (deleteError) throw deleteError;

            // Update local state
            setItems(prev => prev.filter(i => i.id !== itemId));
        } catch (e) {
            console.error('Failed to delete item:', e);
            setError(e instanceof Error ? e.message : 'Failed to delete item');
        }
    }, []);

    // Move item to a different category
    const moveItem = useCallback(async (itemId: string, newCategory: Category) => {
        setError(null);

        try {
            // Get new order_index for the target category
            const { data: existingItems } = await supabase
                .from('wardrobe_items')
                .select('order_index')
                .eq('user_id', userId)
                .eq('category', newCategory)
                .order('order_index', { ascending: false })
                .limit(1);

            const newOrderIndex = (existingItems?.[0]?.order_index || 0) + 1;

            // Update the item
            const { error: updateError } = await supabase
                .from('wardrobe_items')
                .update({
                    category: newCategory,
                    order_index: newOrderIndex
                })
                .eq('id', itemId);

            if (updateError) throw updateError;

            // Update local state
            setItems(prev => prev.map(item =>
                item.id === itemId
                    ? { ...item, category: newCategory, name: `${newCategory} #${newOrderIndex}` }
                    : item
            ));
        } catch (e) {
            console.error('Failed to move item:', e);
            setError(e instanceof Error ? e.message : 'Failed to move item');
        }
    }, [userId]);

    return {
        items,
        isLoading,
        error,
        uploadItems,
        deleteItem,
        moveItem,
        refreshItems
    };
}
