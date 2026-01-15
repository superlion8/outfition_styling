import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// ============ Vertex AI Client (inlined) ============

// 确保设置 Vertex AI 模式环境变量
if (!process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
}

// GenAI 客户端缓存
let genAIClient: GoogleGenAI | null = null;

// 获取 API Key
function getApiKey(): string {
    const apiKey = process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("VERTEX_AI_API_KEY or GEMINI_API_KEY environment variable is required");
    }
    return apiKey;
}

// 获取 GenAI 客户端（单例）
function getVertexAIClient(): GoogleGenAI {
    if (!genAIClient) {
        const apiKey = getApiKey();
        genAIClient = new GoogleGenAI({ apiKey });
    }
    return genAIClient;
}

// 安全设置配置
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// 调用 Vertex AI Gemini API
async function callVertexAI(modelId: string, contents: any[], config?: any): Promise<any> {
    const client = getVertexAIClient();
    const finalConfig = { ...config, safetySettings };
    const response = await client.models.generateContent({
        model: modelId,
        contents: contents,
        config: finalConfig,
    });
    return response;
}

// ============ End Vertex AI Client ============

// Types
type Category = 'tops' | 'bottoms' | 'onepiece' | 'accessories';

interface WardrobeItem {
    id: string;
    user_id: string;
    category: Category;
    order_index: number;
    image_path: string;
}

interface StylingRequest {
    user_id: string;
    outfit_count: number;
}

interface OutfitResult {
    top?: { id: string; image_url: string; order_index: number };
    bottom?: { id: string; image_url: string; order_index: number };
    onepiece?: { id: string; image_url: string; order_index: number };
    accessory?: { id: string; image_url: string; order_index: number };
}

interface VLMOutfitResponse {
    top_index?: number;
    bottom_index?: number;
    onepiece_index?: number;
    accessory_index?: number;
}

// Initialize Supabase with service role key (server-side)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

// Helper: Convert image URL to base64
async function urlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

// Helper: Get public URL for storage path
function getPublicUrl(imagePath: string): string {
    return `${supabaseUrl}/storage/v1/object/public/wardrobe/${imagePath}`;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user_id, outfit_count }: StylingRequest = req.body;

        // Validate input
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        if (!outfit_count || outfit_count < 1 || outfit_count > 10) {
            return res.status(400).json({ error: 'outfit_count must be between 1 and 10' });
        }

        // Fetch wardrobe items from database
        const { data: items, error: dbError } = await supabase
            .from('wardrobe_items')
            .select('*')
            .eq('user_id', user_id)
            .order('category')
            .order('order_index');

        if (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Failed to fetch wardrobe items' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No wardrobe items found. Please upload some clothes first.' });
        }

        // Group items by category
        const itemsByCategory: Record<Category, WardrobeItem[]> = {
            tops: [],
            bottoms: [],
            onepiece: [],
            accessories: []
        };

        for (const item of items) {
            itemsByCategory[item.category as Category].push(item);
        }

        // Validate: must have at least tops+bottoms OR onepiece
        const hasTopsAndBottoms = itemsByCategory.tops.length > 0 && itemsByCategory.bottoms.length > 0;
        const hasOnepiece = itemsByCategory.onepiece.length > 0;

        if (!hasTopsAndBottoms && !hasOnepiece) {
            return res.status(400).json({
                error: 'Please upload at least (tops + bottoms) or onepiece items to generate outfits.'
            });
        }

        // Build prompt with images
        const promptParts: any[] = [];

        // Add instruction
        promptParts.push({
            text: `你是一位专业的时尚搭配师。我将提供我的衣橱单品图片，请根据这些单品为我搭配 ${outfit_count} 组完整的穿搭方案。

**衣橱清单：**
`
        });

        // Add tops
        if (itemsByCategory.tops.length > 0) {
            promptParts.push({ text: `\n上装 (Tops) - 共 ${itemsByCategory.tops.length} 件：` });
            for (const item of itemsByCategory.tops) {
                const imageUrl = getPublicUrl(item.image_path);
                try {
                    const base64 = await urlToBase64(imageUrl);
                    promptParts.push({ text: `\n上装 #${item.order_index}:` });
                    promptParts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64
                        }
                    });
                } catch (e) {
                    console.error(`Failed to load image for top #${item.order_index}:`, e);
                }
            }
        }

        // Add bottoms
        if (itemsByCategory.bottoms.length > 0) {
            promptParts.push({ text: `\n\n下装 (Bottoms) - 共 ${itemsByCategory.bottoms.length} 件：` });
            for (const item of itemsByCategory.bottoms) {
                const imageUrl = getPublicUrl(item.image_path);
                try {
                    const base64 = await urlToBase64(imageUrl);
                    promptParts.push({ text: `\n下装 #${item.order_index}:` });
                    promptParts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64
                        }
                    });
                } catch (e) {
                    console.error(`Failed to load image for bottom #${item.order_index}:`, e);
                }
            }
        }

        // Add onepiece
        if (itemsByCategory.onepiece.length > 0) {
            promptParts.push({ text: `\n\n连体装 (One-Piece) - 共 ${itemsByCategory.onepiece.length} 件：` });
            for (const item of itemsByCategory.onepiece) {
                const imageUrl = getPublicUrl(item.image_path);
                try {
                    const base64 = await urlToBase64(imageUrl);
                    promptParts.push({ text: `\n连体装 #${item.order_index}:` });
                    promptParts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64
                        }
                    });
                } catch (e) {
                    console.error(`Failed to load image for onepiece #${item.order_index}:`, e);
                }
            }
        }

        // Add accessories
        if (itemsByCategory.accessories.length > 0) {
            promptParts.push({ text: `\n\n配饰 (Accessories) - 共 ${itemsByCategory.accessories.length} 件：` });
            for (const item of itemsByCategory.accessories) {
                const imageUrl = getPublicUrl(item.image_path);
                try {
                    const base64 = await urlToBase64(imageUrl);
                    promptParts.push({ text: `\n配饰 #${item.order_index}:` });
                    promptParts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64
                        }
                    });
                } catch (e) {
                    console.error(`Failed to load image for accessory #${item.order_index}:`, e);
                }
            }
        }

        // Add output format instruction
        promptParts.push({
            text: `

**搭配要求：**
1. 每组搭配至少包含：(1件上装 + 1件下装) 或 (1件连体装)
2. 可以选择性添加配饰
3. 注意颜色搭配和风格统一
4. 尽量避免重复使用同一单品（除非数量不足）

**输出格式：**
请严格以 JSON 格式输出，不要包含任何其他文字说明：
{
  "outfits": [
    {
      "top_index": 1,
      "bottom_index": 2,
      "accessory_index": 1
    },
    {
      "onepiece_index": 1,
      "accessory_index": 2
    }
  ]
}

注意：index 对应上面图片的编号 (#1, #2, ...)。如果某类单品不使用，则不包含该字段。`
        });

        // Call Gemini API via Vertex AI
        // Model config from lib/model_prompts.ts - STYLING_ANALYSIS.MODEL_ID
        const modelId = 'gemini-3-flash-preview';
        const contents = [{ role: 'user', parts: promptParts }];

        const response = await callVertexAI(modelId, contents, {});

        // Extract text response
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response (handle markdown code blocks)
        let vlmOutfits: { outfits: VLMOutfitResponse[] };
        try {
            // Remove markdown code blocks if present
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }
            vlmOutfits = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse VLM response:', responseText);
            return res.status(500).json({
                error: 'Failed to parse AI response',
                raw_response: responseText
            });
        }

        // Map VLM indices back to database items
        const outfitResults: OutfitResult[] = [];

        for (const vlmOutfit of vlmOutfits.outfits) {
            const result: OutfitResult = {};

            if (vlmOutfit.top_index !== undefined) {
                const topItem = itemsByCategory.tops.find(i => i.order_index === vlmOutfit.top_index);
                if (topItem) {
                    result.top = {
                        id: topItem.id,
                        image_url: getPublicUrl(topItem.image_path),
                        order_index: topItem.order_index
                    };
                }
            }

            if (vlmOutfit.bottom_index !== undefined) {
                const bottomItem = itemsByCategory.bottoms.find(i => i.order_index === vlmOutfit.bottom_index);
                if (bottomItem) {
                    result.bottom = {
                        id: bottomItem.id,
                        image_url: getPublicUrl(bottomItem.image_path),
                        order_index: bottomItem.order_index
                    };
                }
            }

            if (vlmOutfit.onepiece_index !== undefined) {
                const onepieceItem = itemsByCategory.onepiece.find(i => i.order_index === vlmOutfit.onepiece_index);
                if (onepieceItem) {
                    result.onepiece = {
                        id: onepieceItem.id,
                        image_url: getPublicUrl(onepieceItem.image_path),
                        order_index: onepieceItem.order_index
                    };
                }
            }

            if (vlmOutfit.accessory_index !== undefined) {
                const accItem = itemsByCategory.accessories.find(i => i.order_index === vlmOutfit.accessory_index);
                if (accItem) {
                    result.accessory = {
                        id: accItem.id,
                        image_url: getPublicUrl(accItem.image_path),
                        order_index: accItem.order_index
                    };
                }
            }

            outfitResults.push(result);
        }

        // Return results
        return res.status(200).json({
            success: true,
            outfits: outfitResults,
            metadata: {
                requested_count: outfit_count,
                returned_count: outfitResults.length,
                items_used: {
                    tops: itemsByCategory.tops.length,
                    bottoms: itemsByCategory.bottoms.length,
                    onepiece: itemsByCategory.onepiece.length,
                    accessories: itemsByCategory.accessories.length
                }
            }
        });

    } catch (error) {
        console.error('Styling API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
