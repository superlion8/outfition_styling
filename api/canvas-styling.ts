import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// ============ Vertex AI Client ============
if (!process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
}

let genAIClient: GoogleGenAI | null = null;

function getApiKey(): string {
    const apiKey = process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("VERTEX_AI_API_KEY or GEMINI_API_KEY environment variable is required");
    }
    return apiKey;
}

function getVertexAIClient(): GoogleGenAI {
    if (!genAIClient) {
        genAIClient = new GoogleGenAI({ apiKey: getApiKey() });
    }
    return genAIClient;
}

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function callVertexAI(modelId: string, contents: any[], config?: any): Promise<any> {
    const ai = getVertexAIClient();
    const response = await ai.models.generateContent({
        model: modelId,
        contents,
        config: { safetySettings, ...config },
    });
    return response;
}

// Types
interface CanvasStylingRequest {
    screenshot: string;  // base64 screenshot with index overlays
    itemCount: number;   // total number of items in screenshot
    outfitCount: number;
    userPrompt?: string;
}

interface CanvasOutfitResult {
    selectedIndices: number[];
    reason: string;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { screenshot, itemCount, outfitCount, userPrompt }: CanvasStylingRequest = req.body;

        // Validate
        if (!screenshot) {
            return res.status(400).json({ error: 'Screenshot is required' });
        }
        if (!itemCount || itemCount < 2) {
            return res.status(400).json({ error: 'At least 2 items are required' });
        }
        if (!outfitCount || outfitCount < 1 || outfitCount > 10) {
            return res.status(400).json({ error: 'outfitCount must be between 1 and 10' });
        }

        // Build prompt with screenshot
        const promptParts: any[] = [];

        promptParts.push({
            text: `你是一位专业的时尚搭配师。我将提供一张服装单品截图，图中包含 ${itemCount} 件服装单品。
每件单品左上角都有一个紫色编号标签 (#1, #2, #3...)。

请仔细观察截图中的所有单品，根据编号为我搭配 ${outfitCount} 组完整的穿搭方案。

**服装单品截图：**
`
        });

        // Add screenshot image (auto-detect mime type)
        const mimeMatch = screenshot.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
        promptParts.push({
            inlineData: {
                mimeType,
                data: base64Data
            }
        });

        // Add user prompt if provided
        if (userPrompt) {
            promptParts.push({
                text: `\n\n**用户的特别要求：**\n${userPrompt}\n请务必在搭配时遵从上述要求。\n`
            });
        }

        // Output format instruction
        promptParts.push({
            text: `

**搭配要求：**
1. 必须生成 **${outfitCount}** 组搭配
2. 每组搭配选择 2-4 件单品组成一套穿搭
3. 优先考虑颜色协调、风格统一
4. 如果单品数量不足，可以重复使用某些单品

**输出格式：**
请严格以 JSON 格式输出，不要包含任何其他文字说明：
{
  "outfits": [
    {
      "selectedIndices": [1, 3, 5],
      "reason": "这套搭配采用了...（请用中文简要说明搭配理由）"
    },
    {
      "selectedIndices": [2, 4],
      "reason": "这套搭配...（中文理由）"
    }
  ]
}

注意：selectedIndices 数组包含选中单品的编号 (#1, #2, ... 对应数字 1, 2, ...)。`
        });

        // Call Gemini API
        const modelId = 'gemini-3-flash-preview';
        const contents = [{ role: 'user', parts: promptParts }];
        const response = await callVertexAI(modelId, contents, {});

        // Extract text response
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        let vlmResult: { outfits: CanvasOutfitResult[] };
        try {
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }
            vlmResult = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse VLM response:', responseText);
            return res.status(500).json({ error: 'Failed to parse AI response', raw: responseText });
        }

        // Validate results
        if (!vlmResult.outfits || !Array.isArray(vlmResult.outfits)) {
            return res.status(500).json({ error: 'Invalid AI response format', raw: responseText });
        }

        return res.status(200).json({
            success: true,
            outfits: vlmResult.outfits,
        });

    } catch (error) {
        console.error('Canvas styling error:', error);
        return res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
}
