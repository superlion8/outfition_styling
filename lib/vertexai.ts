/**
 * Vertex AI Gemini API 工具函数
 * 参考 Sparkit 项目的实现方式
 * 
 * 环境变量配置：
 * - VERTEX_AI_API_KEY: Google Cloud API Key
 * - GOOGLE_GENAI_USE_VERTEXAI=true: 启用 Vertex AI 端点 (自动设置)
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

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

// 获取 GenAI 客户端（单例）- 使用 Vertex AI 端点
export function getVertexAIClient(): GoogleGenAI {
    if (!genAIClient) {
        const apiKey = getApiKey();
        genAIClient = new GoogleGenAI({
            apiKey,
            // Vertex AI 模式通过环境变量 GOOGLE_GENAI_USE_VERTEXAI=true 自动启用
        });
    }
    return genAIClient;
}

// 安全设置配置 - 同 Sparkit，设置为 BLOCK_NONE 避免误触
export const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

// 调用 Vertex AI Gemini API
export async function callVertexAI(
    modelId: string,
    contents: any[],
    config?: any
): Promise<any> {
    const client = getVertexAIClient();

    const finalConfig = {
        ...config,
        safetySettings: safetySettings,
    };

    const response = await client.models.generateContent({
        model: modelId,
        contents: contents,
        config: finalConfig,
    });

    return response;
}
