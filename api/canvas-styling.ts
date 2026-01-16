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

        // Main instruction
        let mainPrompt = `你是一个专业的服装搭配师。以下截图是一个服装搭配库，每件单品左上角都有一个紫色编号标签 (#1, #2, #3...)。

请你基于时尚潮流趋势和这个库里衣服的风格，给出 ${outfitCount} 套服装搭配的建议。`;

        // Add user requirements if provided
        if (userPrompt) {
            mainPrompt += `

额外要求：${userPrompt}`;
        }

        mainPrompt += `

**搭配规则：**
1. 每一套搭配需要 2-5 件商品
2. 搭配要是一套完整的 look，避免出现两个包、两条裤子、两件外套这种不合理的搭配
3. 优先考虑颜色协调、风格统一

**服装搭配库截图：**
`;

        promptParts.push({ text: mainPrompt });

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

        // Output format instruction
        promptParts.push({
            text: `

**输出格式：**
请严格以 JSON 格式输出每套 outfit、每套 outfit 的商品编号、选择这套搭配的中文原因：
{
  "outfits": [
    {
      "selectedIndices": [1, 3, 5],
      "reason": "搭配理由（中文，简洁说明为什么选择这几件单品）"
    }
  ]
}

注意：selectedIndices 数组包含选中单品的编号 (#1, #2, ... 对应数字 1, 2, ...)。
必须生成 ${outfitCount} 组搭配。`
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
