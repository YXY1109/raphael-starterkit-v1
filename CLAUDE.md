# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 14+ App Router 的 SaaS 启动套件，专为 AI 中文名字生成器服务设计。项目使用 TypeScript 构建类型安全的应用，集成了 Supabase（认证、数据库）和 Creem.io（支付系统）。

## 常用开发命令

```bash
# 开发环境
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start

# 安装依赖
npm i
```

## 核心架构

### 技术栈
- **Next.js 14+** (App Router) - 全栈 React 框架
- **React 19.0** - UI 库
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Shadcn/ui** - 基于 Radix UI 的组件库
- **Supabase** - 后端服务（认证、数据库）
- **Creem.io** - 支付和订阅管理
- **OpenAI/OpenRouter** - AI 名字生成服务
- **Puppeteer** - PDF 生成
- **Framer Motion** - 动画库

### 目录结构关键说明

**App Router 结构：**
- `app/(auth-pages)/` - 认证相关页面组（登录、注册）
- `app/dashboard/` - 需要认证的仪表板页面
- `app/product/` - 核心产品页面（名字生成器、定价等）
- `app/api/` - API 路由
- `app/auth/` - OAuth 回调处理

**组件分层：**
- `components/ui/` - 基础 UI 组件（Shadcn/ui）
- `components/dashboard/` - 仪表板业务组件
- `components/product/` - 产品相关组件
- `components/layout/` - 布局组件

**数据和工具：**
- `utils/supabase/` - Supabase 客户端配置和操作
- `hooks/` - 自定义 React Hooks（用户、订阅、积分等）
- `lib/` - 通用工具函数
- `supabase/` - 数据库迁移文件

### 认证和授权系统

- 基于 Supabase 的身份验证
- 中间件路由保护（`middleware.ts`）
- 支持邮箱密码和 OAuth 登录
- 服务器端会话验证
- 自动重定向未认证用户

### 支付和订阅系统

**双重计费模式：**
1. **订阅模式** - 通过 Creem.io 处理定期付款
2. **积分模式** - 按需消费的积分系统

**关键集成点：**
- Webhook 处理：`app/api/webhooks/creem/route.ts`
- 订阅状态同步：`utils/supabase/subscriptions.ts`
- 积分管理：`utils/supabase/credits.ts`

### 数据库架构

核心表结构：
- `customers` - 客户信息
- `subscriptions` - 订阅状态
- `credits_history` - 积分交易记录
- `profiles` - 用户资料扩展

### 环境变量配置

必需的环境变量（参考 `.env.example`）：
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Creem.io 支付配置
CREEM_API_KEY=
CREEM_WEBHOOK_SECRET=
CREEM_API_URL=https://test-api.creem.io/v1  # 生产环境: https://api.creem.io

# 站点配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CREEM_SUCCESS_URL=http://localhost:3000/dashboard

# AI 服务配置
OPENROUTER_API_KEY=  # 或 OPENAI_API_KEY
OPENAI_BASE_URL=https://openrouter.ai/api/v1
```

### 开发模式和约定

**组件开发：**
- 使用函数组件和 Hooks
- 遵循 PascalCase 命名组件
- 使用 camelCase 命名变量和函数
- 保持深色/浅色主题兼容性

**表单处理：**
- 使用 React Hook Form + Zod 验证
- 服务器操作处理表单提交
- 适当的错误处理和重定向

**样式约定：**
- 优先使用 Tailwind CSS
- 遵循 Shadcn/ui 组件模式
- 使用 `cn()` 工具函数合并类名

### 关键业务逻辑

**AI 名字生成流程：**
1. 用户在生成器页面输入需求
2. 调用 AI API（OpenRouter/OpenAI）
3. 返回个性化的中文名字建议
4. 提供文化背景和字符解释

**订阅和积分处理：**
1. 用户通过 Creem.io 完成支付
2. Webhook 接收支付事件
3. 更新数据库中的订阅状态或积分余额
4. 实时反映在前端界面

### 安全注意事项

- 所有 API 密钥存储在环境变量中
- Supabase RLS（行级安全）保护数据访问
- Webhook 签名验证确保请求来源可信
- 输入验证和服务器端数据清理

### 部署相关

项目设计为在 Vercel 上轻松部署：
1. 连接 GitHub 仓库
2. 配置环境变量
3. 自动部署和 HTTPS
4. 更新生产环境的 Webhook URL

### 常见开发任务

**添加新的 API 端点：**
在 `app/api/` 下创建路由文件，使用 Next.js App Router 的 API 路由模式。

**数据库表修改：**
在 `supabase/migrations/` 下创建新的迁移文件，通过 Supabase Dashboard 执行。

**添加新的订阅产品：**
1. 在 Creem.io 创建产品
2. 更新代码中的产品 ID
3. 在相关组件中添加新的定价选项

**主题定制：**
修改 `tailwind.config.ts` 中的颜色配置，使用 CSS 变量支持主题切换。