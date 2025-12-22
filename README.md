# Raphael Starter Kit

这是一个面向编程小白的现代化启动套件，基于 Next.js、Supabase 和 Creem.io 构建。专为帮助开发者快速搭建支持全球用户登录和支付的网站，特别对中国大陆开发者友好。

## 🌟 简介

这是一个基于 Next.js、Supabase 和 Creem.io 构建的现代化、生产就绪的启动套件。非常适合快速构建具有身份验证、订阅和积分系统的 SaaS 应用程序，让您的 MVP 开发速度提升10倍。

## 核心特色功能

- 💯 **精美的用户界面**
  - 经过精心设计的现代化界面
  - 优雅的响应式设计，在各种设备上呈现完美体验
  - 平滑的动画和过渡效果
  - 精心优化的布局和组件排列
  - 专业的色彩方案和排版

- 🚀 **Next.js App Router**
  - 使用最新的 Next.js 功能
  - 服务器组件和客户端组件的最佳组合
  - 内置的路由保护
  - 快速的页面加载和导航体验

- 🔐 **全面的身份验证系统**
  - 基于 Supabase
  - 电子邮件/密码认证
  - OAuth 提供商支持 (Google, GitHub等)
  - 安全的会话管理
  - 使用中间件保护路由
  
- 💳 **完整的支付与订阅系统**
  - 与 Creem.io 完美集成，支持全球信用卡收款 
  - 特别适合中国大陆用户作为商家使用
  - 多级订阅方案
  - 灵活的积分系统
  - 详细的使用量跟踪

- 🇨🇳 **AI中文名字生成器**
  - 基于OpenAI/OpenRouter的智能名字生成
  - 个性化分析和文化匹配
  - 免费试用和付费增强功能
  - 完整的字符解释和文化背景
  - 流行名字展示和收藏功能

- 🛠️ **开发者友好**
  - TypeScript 类型安全
  - 清晰的项目结构
  - 完善的文档
  - Cursor编辑器友好框架

## 📱 响应式设计

Raphael Starter Kit 采用了全面的响应式设计，确保您的应用在任何设备上都能完美呈现：

- 手机端优化的导航和布局
- 平板电脑友好的交互设计
- 桌面端的高效工作流
- 精确的组件间距和对齐

## 🎨 UI 组件库

我们的启动套件包含了丰富的预构建组件，帮助您快速组装精美的界面：

- 现代化的导航栏和页脚
- 引人注目的英雄区域
- 特色功能展示组件
- 专业的徽标云展示
- 灵活的FAQ手风琴组件
- 精美的定价卡片
- 引人注目的行动号召按钮
- 引导用户的清晰路径

## 快速开始

### 前提条件

- Node.js 18+ 和 npm
- Supabase 账户
- Creem.io 账户

### 步骤 1: 克隆仓库

```bash
git clone https://github.com/yourusername/raphael-starter-kit.git
cd raphael-starter-kit
```

### 步骤 2: 安装依赖

```bash
pnpm i
```

### 步骤 3: 设置 Supabase

1. 在 [Supabase](https://app.supabase.com) 上创建一个新项目
   - 点击"新建项目"
   - 填写基本信息（项目名称、密码等）

2. 前往 项目设置 > API 获取项目凭证
   - 从项目设置页面复制凭证信息
   - 将凭证粘贴到.env文件中

3. 配置登录认证
   - 选择【Auth】>【Providers】
   - 选择email认证
   - 关闭"Confirm email"选项并保存设置

4. (可选) 设置Google登录
   - 进入[Google 开发者控制台](https://console.cloud.google.com)，创建新项目
   - 配置项目权限
   - 前往【API与服务】>【凭据】
   - 创建OAuth客户端ID
   - 添加授权来源URL和重定向URI
   - 重定向URI格式: `https://<项目ID>.supabase.co/auth/v1/callback`
   - 复制OAuth客户端ID和密钥

5. 在Supabase配置Google认证
   - 打开Auth > Providers > Google
   - 填写从Google开发者控制台获取的客户端ID和密钥
   - 启用Google认证

6. 设置定向URL
   - 将定向URL更改为您的线上地址
   - 确保URL与Google开发者控制台中的地址完全一致

7. 设置环境变量
   ```bash
   cp .env.example .env.local
   ```
   
   在`.env.local`中更新Supabase变量:
   ```
   NEXT_PUBLIC_SUPABASE_URL=你的项目URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的匿名密钥
   SUPABASE_SERVICE_ROLE_KEY=你的服务角色密钥
   ```

8. 创建数据库表结构
   - 复制SQL代码到Supabase SQL编辑器
   - 执行SQL创建必要的表结构

### 步骤 4: 设置 Creem.io

1. 登录到 [Creem.io 仪表板](https://www.creem.io/)
2. 初始设置
   - 打开测试模式
   - 导航到顶部导航栏中的"开发者"部分
   - 复制API Key并粘贴到.env文件中

3. 创建Webhooks
   - 前往开发者 > Webhooks
   - 创建新的Webhook
   - 填写URL: `https://你的域名/api/webhooks/creem`
   - 复制Webhook密钥并粘贴到.env文件中

4. 更新环境变量
   ```
   CREEM_API_URL=https://test-api.creem.io/v1
   ```

5. 创建收费项目
   - 在Creem.io中创建订阅项目和积分项目
   - 复制项目ID并配置到代码中

6. 完整的环境变量示例
   ```
   # Supabase配置
   NEXT_PUBLIC_SUPABASE_URL=你的supabaseURL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的supabase pubilc key
   SUPABASE_SERVICE_ROLE_KEY=你的supabase SERVICE_ROLE key

   # Creem配置
   CREEM_WEBHOOK_SECRET=你的webhook key
   CREEM_API_KEY=你的creem key
   CREEM_API_URL=https://test-api.creem.io/v1

   # 站点URL配置
   NEXT_PUBLIC_SITE_URL=http://你的线上地址
   
   # 支付成功后的重定向URL
   CREEM_SUCCESS_URL=http://你的线上地址/dashboard
   ```

### 步骤 5: 运行开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看你的应用程序。

### 步骤 6: Vercel部署

1. 将代码推送到GitHub
2. 将仓库导入到[Vercel](https://vercel.com)
3. 添加所有环境变量
4. 完成部署

### 步骤 7: 更新Webhook回调地址

1. 进入Creem.io，打开开发者模式
2. 更新Webhooks配置
   - 进入对应的Webhook设置
   - 点击"更多"，选择"编辑"
   - 将线上地址更新为: `https://你的域名/api/webhooks/creem`

### 步骤 8: 测试系统功能

1. 测试用户登录功能
2. 测试订阅支付功能（测试信用卡号: 4242 4242 4242 4242）
3. 测试积分购买功能

### 步骤 9: 设计网站首页

1. 使用组件库
   - 您可以使用[TailwindCSS](https://tailwindcss.com)上的组件
   - 复制代码到相应的组件文件中

2. 自定义页面配色
   - 调整全局色系
   - 将样式代码添加到全局CSS文件中

3. 根据需要精修页面布局

### 步骤 10: 切换到正式付款

1. 进入Creem.io，关闭测试模式
2. 创建新的正式项目，将ID更新到代码中
3. 更新环境变量，将API URL从测试环境切换到正式环境:
   ```
   # 将此行
   CREEM_API_URL=https://test-api.creem.io/v1
   
   # 替换为
   CREEM_API_URL=https://api.creem.io
   ```

## 💳 订阅系统详情

启动套件包含由 Creem.io 提供支持的完整订阅系统：

- 多级订阅方案
- 基于使用量的计费
- 积分系统
- 订阅管理
- 安全支付处理
- Webhook 集成实时更新
- 自动发票生成
- 全球支付支持（特别适合中国大陆商家）

### 设置 Webhooks

处理订阅更新和支付事件:

1. 前往 Creem.io 仪表板
2. 导航到 开发者 > Webhooks
3. 添加你的 webhook 端点: `https://your-domain.com/api/webhooks/creem`
4. 复制 webhook 密钥并添加到你的 `.env.local`:
   ```
   CREEM_WEBHOOK_SECRET=你的webhook密钥
   ```

## 项目结构

```
├── app/                   # Next.js 应用目录
│   ├── (auth-pages)/     # 身份验证页面
│   ├── dashboard/        # 仪表板页面
│   ├── api/             # API 路由
│   └── layout.tsx       # 根布局
├── components/           # React 组件
│   ├── ui/             # Shadcn/ui 组件
│   ├── dashboard/      # 仪表板组件
│   └── home/          # 登陆页面组件
│   └── layout/        # 页面布局组件
├── hooks/               # 自定义 React 钩子
├── lib/                # 工具库
├── public/             # 静态资源
├── styles/             # 全局样式
├── types/              # TypeScript 类型
└── utils/              # 工具函数
```

## 支持与联系

如果您有任何问题或需要支持，请通过微信联系我们。
