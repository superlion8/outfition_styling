import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// ============ Vertex AI Client (inlined for Vercel compatibility) ============

// Ensure Vertex AI mode environment variable is set
if (!process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
}

// GenAI client cache
let genAIClient: GoogleGenAI | null = null;

// Get API Key
function getApiKey(): string {
    const apiKey = process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("VERTEX_AI_API_KEY or GEMINI_API_KEY environment variable is required");
    }
    return apiKey;
}

// Get GenAI client (singleton)
function getVertexAIClient(): GoogleGenAI {
    if (!genAIClient) {
        const apiKey = getApiKey();
        genAIClient = new GoogleGenAI({ apiKey });
    }
    return genAIClient;
}

// Safety settings
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Call Vertex AI Gemini API
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

// Helper: Convert base64 data URL to pure base64
function extractBase64(dataUrl: string): { mimeType: string; data: string } {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (match) {
        return { mimeType: match[1], data: match[2] };
    }
    // If no data: prefix, assume it's already pure base64
    return { mimeType: 'image/jpeg', data: dataUrl };
}

// Helper: Fetch image URL and convert to base64
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
        const { outfitScreenshot, modelImage, userPrompt } = req.body;

        if (!outfitScreenshot) {
            return res.status(400).json({ error: 'outfitScreenshot is required' });
        }

        if (!modelImage) {
            return res.status(400).json({ error: 'modelImage is required' });
        }

        console.log(`Generating shoot with model image and outfit...`);

        // Prepare prompt parts
        const promptParts: any[] = [];

        // 1. Add model reference image
        console.log("Processing model image...");
        let modelImageBase64: string;
        if (modelImage.startsWith('data:') || modelImage.startsWith('http')) {
            if (modelImage.startsWith('data:')) {
                const extracted = extractBase64(modelImage);
                modelImageBase64 = extracted.data;
            } else {
                modelImageBase64 = await urlToBase64(modelImage);
            }
        } else {
            modelImageBase64 = modelImage; // Assume already base64
        }

        promptParts.push({
            text: `**Target Model Reference:**
Generate a fashion model photo using a model that looks similar to the reference below.
Maintain the model's physical characteristics: face shape, ethnicity, body type, and hair style.`
        });

        promptParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: modelImageBase64
            }
        });

        // 2. Add outfit screenshot
        console.log("Processing outfit screenshot...");
        const outfitData = extractBase64(outfitScreenshot);

        promptParts.push({
            text: `\n**Outfit to Wear:**
The model MUST be wearing the clothing items shown in the following image.
Replace the model's original clothes with these exact items.
Ensure the clothing fits naturally and realistically on the model.`
        });

        promptParts.push({
            inlineData: {
                mimeType: outfitData.mimeType,
                data: outfitData.data
            }
        });

        // 3. Main prompt with user requirements
        let styleRequirements = `
**Style Requirements:**
- Full body shot, professional studio lighting
- Clean white or neutral background
- Natural standing pose or walking pose
- Professional e-commerce photography style
- High quality, sharp details, realistic textures`;

        if (userPrompt) {
            styleRequirements += `\n\n**Additional User Requirements:**\n${userPrompt}`;
        }

        promptParts.push({ text: styleRequirements });

        // Configuration
        const modelId = 'gemini-3-pro-image-preview';
        const generationConfig = {
            responseModalities: ["IMAGE"],
            imageConfig: {
                aspectRatio: '3:4',
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

        // Return base64 image
        return res.status(200).json({
            image: base64Image,
            mimeType: 'image/jpeg'
        });

    } catch (error: any) {
        console.error('Shoot generation error:', error);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
