# 技术架构设计文档 (Technical Architecture Design) - Vercel + Supabase 版

本项目 `fashionai-canvas` 是一个基于 AI 的时尚搭配应用。根据您的要求，架构调整为基于 **Vercel** 的 Serverless 架构和 **Supabase** 的后端即服务 (BaaS)。

## 1. 系统概览 (System Overview)

采用 **Serverless & BaaS (Backend as a Service)** 架构，极大地简化运维成本，同时保持高扩展性。

- **前端 & API 托管 (Frontend & App Logic)**: **Vercel**
    - 托管 React 前端静态资源。
    - 托管 Serverless Functions (无需独立维护服务器)。
- **后端服务 (Backend Services)**: **Supabase**
    - **Database**: PostgreSQL (存储业务数据)。
    - **Auth**: 用户认证与授权。
    - **Storage**: 对象存储 (图片文件)。
    - **Vector**: pgvector (向量搜索支持)。
- **AI 服务**: 集成 Google Gemini / Vertex AI。

## 2. 前端架构 (Frontend Architecture)

部署于 Vercel，沿用 React 生态。

*   **核心框架**: `React 19` + `TypeScript`
*   **构建工具**: `Vite` (Vercel 对 Vite 支持极佳)
*   **API 客户端**: `Supabase JS Client` (直接与 DB/Storage 交互) + `Axios/Fetch` (调用 Vercel Serverless Functions).
*   **状态管理**: `Zustand` 或 `React Context`.

## 3. 后端架构 (Backend Architecture - Vercel Serverless)

不搭建独立的 Node.js 进程，而是使用 **Vercel Serverless Functions**。

*   **位置**: 项目根目录 `/api` 文件夹 (Vercel 默认约定)。
*   **运行环境**: Node.js / Edge Runtime.
*   **主要职责**:
    1.  **AI 代理 (AI Proxy)**: 安全地调用 Google Gemini API，隐藏 `GEMINI_API_KEY`。
    2.  **复杂业务逻辑**: 处理无法直接通过 Supabase RLS (Row Level Security) 解决的逻辑。
    3.  **Webhooks**: 接收第三方回调。

## 4. 数据库与服务架构 (Supabase)

使用 Supabase 提供的全套后端能力。

*   **数据库 (Database)**: PostgreSQL
    *   启用 `pgvector` 扩展，用于存储图片或文本的 Embedding 向量，实现"风格搜索"或"相似单品推荐"。
*   **认证 (Authentication)**: Supabase Auth
    *   支持 Email/Password, Google OAuth 等多种登录方式。
    *   **Row Level Security (RLS)**: 在数据库层级严格控制数据访问权限 (例如：用户只能看到自己的衣橱)。
*   **存储 (Storage)**: Supabase Storage
    *   创建一个 `wardrobe` Bucket 存储用户上传的衣物图片。
*   **实时 (Realtime)**: 可选，用于多端同步状态。

### 核心数据模型 (ERD 简述)

1.  **profiles (用户表 - 扩展 Supabase auth.users)**
    *   `id`: UUID (FK -> auth.users.id)
    *   `username`: String
    *   `avatar_url`: String

2.  **wardrobe_items (衣橱单品表)**
    *   `id`: UUID
    *   `user_id`: UUID (FK -> auth.users.id)
    *   `category`: Enum (tops, bottoms, onepiece, accessories)
    *   `image_path`: String (Supabase Storage path)
    *   `meta_tags`: JSONB (AI 分析出的属性)
    *   `embedding`: Vector (1536维，用于 AI 搜索)

3.  **outfits (搭配方案表)**
    *   `id`: UUID
    *   `user_id`: UUID
    *   `items`: JSONB (包含所有单品的 ID 和位置信息)
    *   `style_score`: Float
    *   `created_at`: Timestamp

## 5. 基础设施与部署 (Infrastructure)

*   **部署平台**: Vercel (连接 GitHub 仓库自动部署)。
*   **环境变量管理**:
    *   Vercel Dashboard 配置 `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`。
*   **本地开发**:
    *   `Vercel CLI`: `vercel dev` 模拟线上环境。
    *   `Supabase CLI`: 本地启动完整的 Supabase 栈 (DB, Auth, Storage) 进行开发测试，随后 `supabase db push` 同步到云端。

## 6. 数据流向示例 (Data Flow - Updated)

1.  **上传衣物**:
    *   前端直传图片至 Supabase Storage。
    *   触发 Supabase Database Trigger (可选) 或 前端调用 Vercel Function (`/api/analyze-image`)。
    *   Vercel Function 调用 Gemini 分析图片，返回标签。
    *   前端将图片路径 + 标签写入 Supabase `wardrobe_items` 表。
2.  **生成搭配**:
    *   前端调用 Vercel Function (`/api/generate-outfit`)。
    *   Function 从 Supabase 读取用户衣橱数据。
    *   Function 组装 Prompt 调用 Gemini。
    *   返回结果展示。
