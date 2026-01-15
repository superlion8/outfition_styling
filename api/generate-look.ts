import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// ============ Vertex AI Client (inlined for Vercel compatibility) ============

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

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

const WARDROBE_BUCKET = 'wardrobe';

function getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(WARDROBE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

async function urlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (e) {
        console.error(`Error converting URL to base64: ${url}`, e);
        throw e;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { items, model_description, model_image_url } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Please provide at least one item' });
        }

        console.log(`Generating look for ${items.length} items...`);

        // Prepare Prompt Parts
        const promptParts: any[] = [];

        // Add Model Image (High priority context)
        if (model_image_url) {
            try {
                console.log("Processing model image...");
                const modelBase64 = await urlToBase64(model_image_url);
                promptParts.push({
                    text: `\nTarget Model Reference (Generate a model looking similar to this one, maintaining ethnicity, body type, and hair):`
                });
                promptParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: modelBase64
                    }
                });
            } catch (e) {
                console.error("Failed to process model image", e);
            }
        }
        let outfitDesc = "";

        // Text Prompt using template from model_prompts.ts (hardcoded here to avoid import issues)
        const PROMPT_TEMPLATE = `Generate a fashion e-commerce style photo.

**Model Description:**
${model_description || 'A professional fashion model with natural makeup and confident pose.'}

**Outfit to wear:**
The model is wearing the clothing items provided in the images.
Please ensure the generated image accurately reflects the visual details, colors, and textures of the provided clothing items.
Integrate these items into a cohesive, stylish outfit.

**Style Requirements:**
- Full body shot, studio lighting
- Clean white or neutral background
- Natural standing pose
- Professional e-commerce photography style
- High quality, sharp details
`;

        promptParts.push({ text: PROMPT_TEMPLATE });

        // Process Images
        for (const [index, item] of items.entries()) {
            if (!item.image_path) continue;

            try {
                const imageUrl = getPublicUrl(item.image_path);
                const base64 = await urlToBase64(imageUrl);

                promptParts.push({
                    text: `\nItem #${index + 1} (${item.category}):`
                });

                promptParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64
                    }
                });
            } catch (e) {
                console.error(`Failed to process item image: ${item.image_path}`, e);
            }
        }

        // Configuration
        const modelId = 'gemini-3-pro-image-preview'; // FROM model_prompts.ts
        const generationConfig = {
            responseModalities: ["IMAGE"], // Force image generation
            imageConfig: {
                aspectRatio: '9:16',
                numberOfImages: 1
            }
        };

        // Call API
        console.log(`Calling Vertex AI model: ${modelId}`);
        const response = await callVertexAI(modelId, [{ role: 'user', parts: promptParts }], generationConfig);

        // Process Response
        console.log("Vertex AI Response received");

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No candidates returned");

        // Look for image data in parts
        let base64Image = null;
        for (const part of candidate.content?.parts || []) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                base64Image = part.inlineData.data;
                break;
            }
        }

        if (!base64Image) {
            console.error("No image data found in response:", JSON.stringify(response, null, 2));
            return res.status(500).json({ error: 'Failed to generate image', details: 'No image data returned from model' });
        }

        // Return base64 image directly
        // Client can display it using `data:image/jpeg;base64,...`
        return res.status(200).json({
            image: base64Image,
            mimeType: 'image/jpeg'
        });

    } catch (error: any) {
        console.error('Look generation error:', error);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
