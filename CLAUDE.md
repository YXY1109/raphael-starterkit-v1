# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Raphael Starter Kit 是一个基于 Next.js 16、Supabase 和 Creem.io 构建的 SaaS 启动套件，主要功能是 AI 中文名字生成器，支持用户认证、订阅支付和积分系统。

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发服务器 (使用 Turbopack)
pnpm run dev

# 生产构建
pnpm run build

# 生产环境运行
pnpm run start
```

## 核心架构

### Next.js 16 配置

- **Turbopack**: 项目默认使用 Turbopack 作为打包工具
- **Proxy 替代 Middleware**: 使用 `proxy.ts` 而非 `middleware.ts`（Next.js 16 新规范）
- **Tailwind CSS v3**: 使用 Tailwind CSS v3.4.17，在 `app/globals.css` 中使用 `@tailwind` 指令而非 v4 的 `@import` 语法

### 关键配置文件

- [`next.config.ts`](next.config.ts) - Next.js 配置，包含 `turbopack: {}` 和 webpack 配置
- [`tailwind.config.ts`](tailwind.config.ts) - Tailwind 配置，支持深色/浅色主题
- [`postcss.config.js`](postcss.config.js) - PostCSS 配置（使用 .js 而非 .mjs）
- [`tsconfig.json`](tsconfig.json) - TypeScript 配置，使用 `@/*` 路径别名

### 认证与路由保护

认证系统使用 Supabase SSR，关键文件：

- [`proxy.ts`](proxy.ts) - **Next.js 16 的路由中间件**，从 `middleware.ts` 重命名而来，导出 `proxy` 函数而非 `middleware` 函数
- [`utils/supabase/middleware.ts`](utils/supabase/middleware.ts) - `updateSession()` 函数处理会话刷新和路由保护
  - 保护 `/dashboard` 路由（未登录用户重定向到 `/sign-in`）
- [`utils/supabase/client.ts`](utils/supabase/client.ts) - 客户端 Supabase 实例
- [`utils/supabase/server.ts`](utils/supabase/server.ts) - 服务端 Supabase 实例
- [`utils/supabase/service-role.ts`](utils/supabase/service-role.ts) - 服务角色客户端（绕过 RLS）
- [`app/actions.ts`](app/actions.ts) - 服务器操作（signUp、signIn、signOut、updatePassword）

### 订阅与支付系统

使用 Creem.io 处理支付和订阅，关键组件：

- [`utils/supabase/subscriptions.ts`](utils/supabase/subscriptions.ts) - 订阅管理核心函数：
  - `createOrUpdateCustomer()` - 创建/更新客户信息
  - `createOrUpdateSubscription()` - 创建/更新订阅
  - `getUserSubscription()` - 获取用户活跃订阅
  - `addCreditsToCustomer()` - 添加积分（支付后）
  - `useCredits()` - 扣除积分（生成名字时）
  - `getCustomerCredits()` - 查询积分余额
  - `getCreditsHistory()` - 积分历史记录

- [`app/api/webhooks/creem/route.ts`](app/api/webhooks/creem/route.ts) - Webhook 处理路由：
  - 处理订阅事件：`checkout.completed`、`subscription.active`、`subscription.paid`、`subscription.canceled`、`subscription.expired`、`subscription.trialing`
  - 验证 webhook 签名（使用 `utils/creem/verify-signature.ts`）
  - 通过 `metadata.user_id` 关联 Supabase 用户

- [`hooks/use-subscription.ts`](hooks/use-subscription.ts) - 订阅状态 Hook
- [`hooks/use-credits.ts`](hooks/use-credits.ts) - 积分余额 Hook
- [`components/dashboard/subscription-status-card.tsx`](components/dashboard/subscription-status-card.tsx) - 订阅状态显示

### AI 名字生成系统

使用 OpenRouter 或 OpenAI 进行中文名字生成，支持提供商自动检测和切换：

- [`app/api/chinese-names/generate/route.ts`](app/api/chinese-names/generate/route.ts) - AI 名字生成 API
  - **提供商检测逻辑**：根据 `OPENAI_BASE_URL` 自动判断使用 OpenRouter 还是 OpenAI
  - **API 密钥优先级**：OpenRouter 优先使用 `OPENROUTER_API_KEY`，OpenAI 优先使用 `OPENAI_API_KEY`
  - **标准方案 (planType='1')**：1 积分，基础个性化
  - **高级方案 (planType='4')**：4 积分，深度个性化分析
  - **支持批次继续**：`continueBatch=true` 可在现有批次上继续生成更多名字
  - **免费用户限流**：每日 3 次生成（IP 级别限流）
  - **登录用户特权**：每次生成 6 个名字（免费用户 3 个）

**AI 提供商配置规则**：
```typescript
// 1. 判断提供商：OpenRouter 或 OpenAI
const isOpenRouter = !process.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL.includes("openrouter.ai");

// 2. 选择对应的 API 密钥
const apiKey = isOpenRouter
  ? (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '')
  : (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || '');

// 3. 选择对应的模型
const model = isOpenRouter
  ? (process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash")
  : (process.env.OPENAI_MODEL || "gpt-4o-mini");
```

### IP 限流系统

未登录用户通过 IP 地址进行每日生成次数限制：

- 数据库函数：`check_ip_rate_limit(p_client_ip)` - 检查 IP 是否超过每日限制
- 限制规则：每个 IP 每日最多 3 次生成
- 限流记录存储在 `ip_usage_logs` 表中
- 登录后无限制（但受积分余额约束）

### Doubao TTS 语音合成

集成豆包（ByteDance）TTS 服务用于中文名字语音播放：

- [`app/api/tts/route.ts`](app/api/tts/route.ts) - TTS API 路由
  - 仅限登录用户使用（需要认证）
  - 返回 base64 编码的 MP3 音频数据
  - 支持自定义语速和声音类型
  - 30 秒超时保护
  - API 端点：`https://openspeech.bytedance.com/api/v1/tts`

**TTS 调用示例**：
```typescript
// 请求
POST /api/tts
{ "text": "张三" }

// 响应
{
  "success": true,
  "audioData": "base64_encoded_mp3",
  "duration": 1.2
}
```

### PDF 证书生成

为生成的中文名字创建可下载的 PDF 证书：

- [`utils/pdf-templates/name-certificate.ts`](utils/pdf-templates/name-certificate.ts) - PDF 证书模板
- [`app/api/generate-pdf/route.ts`](app/api/generate-pdf/route.ts) - PDF 生成 API
- 支持自定义证书样式和布局
- 包含名字、拼音、寓意、文化背景等信息

### 批次生成系统

支持在同一批次中多次生成并累积结果：

- **创建新批次**：首次生成时创建 `generation_batches` 记录
- **继续批次**：通过 `continueBatch=true` 和 `batchId` 在现有批次上追加
- **多轮追踪**：`generation_round` 字段记录每轮生成的序号
- **聚合统计**：批次记录包含总名字数、总消耗积分
- **数据结构**：
  - `generation_batches` - 批次元数据
  - `generated_names` - 具体名字数据（关联 batch_id 和 generation_round）

**批次 API 调用示例**：
```typescript
// 首次生成（创建新批次）
POST /api/chinese-names/generate
{
  "englishName": "Alice",
  "planType": "1"
}
// 返回：{ batchId: "uuid", generationRound: 1, ... }

// 继续生成（追加到现有批次）
POST /api/chinese-names/generate
{
  "englishName": "Alice",
  "planType": "1",
  "continueBatch": true,
  "batchId": "uuid"
}
// 返回：{ batchId: "uuid", generationRound: 2, ... }
```

### 数据库表结构

- `customers` - 客户信息（creem_customer_id、email、name、credits）
- `subscriptions` - 订阅信息（creem_subscription_id、status、current_period_start/end）
- `credits_history` - 积分交易记录（customer_id、amount、type、description、creem_order_id）
- `name_generation_logs` - 名字生成历史（用户分析）
- `saved_names` - 用户收藏的名字
- `generation_batches` - 生成批次记录
- `generated_names` - 批次中的具体名字数据（支持多轮生成）
- `popular_names` - 热门名字展示
- `ip_usage_logs` - IP 使用记录（用于未登录用户限流）

### App Router 结构

```
app/
├── (auth-pages)/          # 认证页面组（共享 layout.tsx）
│   ├── sign-in/
│   ├── sign-up/
│   └── forgot-password/
├── dashboard/              # 受保护的仪表板页面
├── auth/callback/          # OAuth 回调处理
├── api/
│   ├── webhooks/creem/    # Creem webhook 处理
│   ├── credits/           # 积分查询 API
│   ├── chinese-names/generate/  # AI 名字生成 API
│   ├── generation-batches/ # 批次管理
│   ├── generation-history/ # 生成历史
│   ├── saved-names/       # 收藏管理
│   ├── tts/               # Doubao TTS 语音合成
│   ├── generate-pdf/      # PDF 证书生成
│   └── creem/             # Creem 客户门户链接
├── product/               # 产品功能页面
├── name-detail/           # 名字详情页面
└── profile/               # 用户个人资料
```

### 自定义 Hooks

- [`hooks/use-user.ts`](hooks/use-user.ts) - 当前用户状态
- [`hooks/use-subscription.ts`](hooks/use-subscription.ts) - 订阅状态
- [`hooks/use-credits.ts`](hooks/use-credits.ts) - 积分余额
- [`hooks/use-toast.ts`](hooks/use-toast.ts) - Toast 通知

### UI 组件

- [`components/ui/`](components/ui/) - shadcn/ui 基础组件
- [`components/dashboard/`](components/dashboard/) - 仪表板专用组件
- [`components/product/`](components/product/) - 产品功能相关组件
- [`components/header.tsx`](components/header.tsx) - 顶部导航栏（包含用户菜单）
- [`components/mobile-nav.tsx`](components/mobile-nav.tsx) - 移动端导航
- [`components/theme-switcher.tsx`](components/theme-switcher.tsx) - 深色/浅色主题切换

## 重要注意事项

### Next.js 16 迁移

1. **Proxy 文件**: 必须使用 `proxy.ts` 导出 `proxy` 函数，而非 `middleware.ts` 导出 `middleware` 函数
2. **Turbopack**: `next.config.ts` 中必须包含 `turbopack: {}` 配置（即使为空）以避免警告
3. **Tailwind CSS**: 使用 v3 语法（`@tailwind base; @tailwind components; @tailwind utilities;`），不要使用 v4 的 `@import "tailwindcss"` 语法

### 环境变量

在 `.env.local` 中配置：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Creem.io
CREEM_WEBHOOK_SECRET=
CREEM_API_KEY=
CREEM_API_URL=https://test-api.creem.io/v1  # 测试环境
# CREEM_API_URL=https://api.creem.io         # 生产环境

# AI 提供商配置 (支持 OpenRouter 和 OpenAI)
# 优先使用 OpenROUTER_API_KEY，如未配置则回退到 OPENAI_API_KEY
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://openrouter.ai/api/v1  # 默认使用 OpenRouter
# OPENAI_BASE_URL=https://api.openai.com/v1   # 使用 OpenAI 官方

# Doubao TTS 配置 (豆包语音合成)
DOUBAO_TTS_APPID=
DOUBAO_TTS_ACCESS_TOKEN=

# 站点配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CREEM_SUCCESS_URL=http://localhost:3000/dashboard
```

### 服务器操作

所有表单提交使用服务器操作（`app/actions.ts`），特征：
- `"use server"` 指令
- 使用 `encodedRedirect()` 进行错误/成功重定向
- 返回 `Redirect` 对象

### 积分系统

- 用户通过 Creem.io 购买积分
- Webhook 处理 `checkout.completed` 事件，调用 `addCreditsToCustomer()`
- 生成名字时通过 `useCredits()` 扣除积分
- 积分记录保存在 `credits_history` 表中

### TypeScript 类型

- `types/creem.ts` - Creem.io 相关类型定义
- `types/supabase.ts` - Supabase 表结构类型
- 使用严格模式和路径别名 `@/*`

### 主题系统

- 使用 `next-themes` 包
- CSS 变量定义在 `app/globals.css` 中的 `:root` 和 `.dark`
- 所有组件应支持深色/浅色模式

## 常见任务

### 添加新的认证页面

在 `app/(auth-pages)/` 下创建新页面，会自动继承认证布局

### 添加新的 API 路由

在 `app/api/` 下创建 `route.ts` 文件，使用 `POST`、`GET` 等导出

### 创建新的数据库查询

在 `utils/supabase/subscriptions.ts` 或 `utils/supabase/server.ts` 中添加函数

### 添加新的 webhook 事件处理

在 `app/api/webhooks/creem/route.ts` 的 switch 语句中添加新的 case

### 创建新的仪表板组件

在 `components/dashboard/` 下创建组件，然后在 `app/dashboard/page.tsx` 中导入使用

### 切换 AI 提供商（OpenRouter ↔ OpenAI）

修改 `.env.local` 中的配置：

```env
# 使用 OpenRouter（默认）
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=sk-or-xxx...
OPENROUTER_MODEL=google/gemini-2.5-flash

# 使用 OpenAI 官方
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxx...
OPENAI_MODEL=gpt-4o-mini
```

系统会根据 `OPENAI_BASE_URL` 自动检测提供商并选择对应的 API 密钥和模型。

### 配置 Doubao TTS

在 `.env.local` 中添加豆包 TTS 凭证：

```env
DOUBAO_TTS_APPID=your_appid
DOUBAO_TTS_ACCESS_TOKEN=your_access_token
```

TTS 功能仅对登录用户开放，未登录用户无法使用语音播放。

### 修改积分消耗规则

在 [`app/api/chinese-names/generate/route.ts:123`](app/api/chinese-names/generate/route.ts#L123) 中修改：

```typescript
const creditCost = parseInt(planType);  // 当前：标准=1，高级=4
// 可修改为固定值或其他计费逻辑
```

### 调整免费用户生成限制

修改数据库函数 `check_ip_rate_limit` 中的每日限制次数（默认 3 次），或修改 [`app/api/chinese-names/generate/route.ts:204`](app/api/chinese-names/generate/route.ts#L204) 中的免费用户生成数量（默认 3 个）。

## 编码标准

### 命名规范
- 使用 TypeScript
- 使用函数组件和 Hooks，避免类组件
- 变量和函数名使用 camelCase 规范
- 组件名使用 PascalCase
- 文件名使用 kebab-case（如 `name-generator-form.tsx`）

### 样式规范
- 使用 Tailwind CSS 进行样式设计
- 遵循 shadcn/ui 组件模式
- 保持深色/浅色主题兼容性
- 使用 CSS 变量（定义在 `app/globals.css` 的 `:root` 和 `.dark` 中）
- 不要混合不同的样式方法，保持主题一致性

### 代码质量
- 添加适当的 TypeScript 类型定义
- 实现适当的错误处理
- 使用 `FormMessage` 组件处理表单错误
- 遵循现有的文件结构和命名约定

## 开发指南

### 添加新功能时
1. 遵循现有的文件结构
2. 添加适当的 TypeScript 类型
3. 实现适当的错误处理
4. 更新相关组件
5. 遵循现有的命名约定
6. 添加适当的验证
7. 保持主题兼容性
8. 确保订阅和支付相关功能的安全性

### 错误处理
- 对异步操作使用 try-catch 块
- 实现适当的错误消息
- 使用 `FormMessage` 组件处理表单错误
- 适当处理身份验证错误
- 处理支付和订阅相关错误
- 服务器操作通过 `encodedRedirect()` 进行错误重定向

### 身份验证相关
- 使用服务器操作（`app/actions.ts`）进行身份验证操作
- 通过适当的重定向处理错误
- 在受保护的路由中检查身份验证状态
- 使用 `proxy.ts` 中间件进行路由保护
- 不要绕过身份验证检查
- 始终处理身份验证错误

### 安全注意事项
- 不要暴露敏感操作，始终验证输入数据
- 确保正确处理 webhook 签名验证（`utils/creem/verify-signature.ts`）
- 妥善保管所有 API 密钥和敏感信息（使用环境变量）
- 实现适当的订阅状态同步机制
- 使用 `service-role` 客户端绕过 RLS 时要格外小心

### 测试清单
在开发新功能或修改现有功能时，确保测试以下内容：
- 身份验证流程（登录、注册、登出）
- 受保护的路由访问控制
- 表单提交和验证
- 错误场景处理
- 主题切换（深色/浅色模式）
- 响应式设计（移动端、平板、桌面）
- 支付流程（测试卡号：4242 4242 4242 4242）
- 订阅状态变更
- Webhook 处理
- 积分系统（购买、扣除、查询余额）
- **AI 名字生成**
  - 免费用户 IP 限流（每日 3 次）
  - 登录用户积分扣除
  - 标准方案 vs 高级方案差异
  - 批次继续生成功能
- **TTS 语音播放**（登录用户）
- **PDF 证书生成**
- **AI 提供商切换**（OpenRouter ↔ OpenAI）

## 故障排查

### 遇到问题时
1. 检查类似文件中的现有实现
2. 仔细查看错误消息和控制台输出
3. 查阅使用库的官方文档
4. 遵循代码库中已建立的模式
5. 参考 Supabase 和 Creem 的官方文档

### 常见陷阱
- 绕过身份验证中间件直接访问受保护路由
- 忘记在受保护的路由中检查用户会话
- 混合使用不同的样式方法导致主题不一致
- 暴露敏感操作，未验证输入数据
- Webhook 签名验证失败
- API 密钥和敏感信息硬编码在代码中
- 订阅状态同步机制实现不当
- 使用错误的 Supabase 客户端（客户端 vs 服务端 vs service-role）
- **AI 配置错误**：`OPENAI_BASE_URL` 和 `OPENAI_API_KEY`/`OPENROUTER_API_KEY` 不匹配导致提供商检测失败
- **TTS 配置缺失**：未设置 `DOUBAO_TTS_APPID` 或 `DOUBAO_TTS_ACCESS_TOKEN` 导致语音播放不可用
- **批次 ID 泄露**：未验证 `batchId` 是否属于当前用户，导致可能访问他人数据
- **积分扣除失败未回滚**：AI 生成成功但积分扣除失败时，未处理数据一致性
