/**
 * Model Prompts - AI 模型和 Prompt 配置
 * 
 * 用于集中管理项目中所有 AI 模型调用的配置，方便后续维护和调优。
 */

// ============================================================================
// 1. 衣橱搭配分析 (Styling Analysis)
// ============================================================================

export const STYLING_ANALYSIS = {
    /**
     * 使用的模型
     * - gemini-2.0-flash: 快速响应，适合实时分析
     * - gemini-2.0-pro: 更高质量，速度较慢
     */
    MODEL_ID: 'gemini-3-flash-preview',

    /**
     * 系统指令 - 开头部分
     * 变量: ${outfit_count} - 需要生成的搭配组数
     */
    SYSTEM_INSTRUCTION: (outfitCount: number) => `你是一位专业的时尚搭配师。我将提供我的衣橱单品图片，请根据这些单品为我搭配 ${outfitCount} 组完整的穿搭方案。

**衣橱清单：**
`,

    /**
     * 分类标签
     */
    CATEGORY_LABELS: {
        tops: '上装 (Tops)',
        bottoms: '下装 (Bottoms)',
        onepiece: '连体装 (One-piece)',
        accessories: '配饰 (Accessories)',
    },

    /**
     * 输出格式指令 - 结尾部分
     */
    OUTPUT_INSTRUCTION: `
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

注意：index 对应上面图片的编号 (#1, #2, ...)。如果某类单品不使用，则不包含该字段。`,

    /**
     * 期望的响应格式
     */
    RESPONSE_SCHEMA: {
        outfits: [
            {
                top_index: 'number | undefined',
                bottom_index: 'number | undefined',
                onepiece_index: 'number | undefined',
                accessory_index: 'number | undefined',
            }
        ]
    }
};


// ============================================================================
// 2. 穿搭效果图生成 (Look Generation) - 保留，后续可用
// ============================================================================

export const LOOK_GENERATION = {
    /**
     * 使用的模型
     * - gemini-2.0-flash: 支持图片生成
     * - imagen-3.0-generate-001: 专业图片生成模型
     */
    MODEL_ID: 'gemini-3-pro-image-preview',

    /**
     * 生成穿搭效果图的 Prompt
     * 变量: 
     *   ${modelDescription} - 模特描述
     *   ${outfitDescription} - 穿搭单品描述
     */
    PROMPT_TEMPLATE: (modelDescription: string, outfitDescription: string) =>
        `Generate a fashion e-commerce style photo.

**Model Description:**
${modelDescription}

**Outfit to wear:**
${outfitDescription}

**Style Requirements:**
- Full body shot, studio lighting
- Clean white or neutral background  
- Natural standing pose
- Professional e-commerce photography style
- High quality, sharp details
`,

    /**
     * 图片生成配置
     */
    IMAGE_CONFIG: {
        aspectRatio: '9:16',
        outputMimeType: 'image/jpeg',
        numberOfImages: 1,
    }
};
