# Obsidian Spec Confirm

Obsidian 插件，用于与 Claude Code 集成，实现 Spec 文档的一键确认工作流。

## 功能

- **侧边栏面板**：在右侧边栏显示等待确认的 Spec 文档
- **一键确认**：在侧边栏直接点击确认按钮，无需切换窗口
- **状态同步**：确认后自动更新文档 frontmatter 的 `status` 字段
- **MCP Server**：内置 MCP Server，接收 Claude Code 的确认请求

## 工作流程

```
Claude Code 生成 Spec 文档
       ↓
调用 spec_confirm MCP 工具
       ↓
侧边栏自动打开，显示文档信息
       ↓
用户在 Obsidian 中审阅文档
       ↓
点击"✓ 确认"按钮
       ↓
文档 status 更新为"已确认"
       ↓
Claude Code 收到响应，继续执行
```

## 安装

1. 构建插件：
```bash
npm install
npm run build
```

2. 将以下文件复制到 Obsidian vault 的 `.obsidian/plugins/obsidian-spec-confirm/` 目录：
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. 在 Obsidian 设置中启用插件

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动重新构建）
npm run dev

# 生产构建
npm run build
```

## MCP 配置

在 Claude Code 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "obsidian-spec-confirm": {
      "type": "http",
      "url": "http://localhost:5300"
    }
  }
}
```

## 文件结构

```
obsidian-spec-confirm/
├── manifest.json           # 插件清单
├── package.json            # npm 配置
├── tsconfig.json           # TypeScript 配置
├── esbuild.config.mjs      # 构建配置
├── main.ts                 # 插件入口
├── styles.css              # 样式文件
└── src/
    ├── mcp-server.ts       # MCP Server 实现
    ├── mcp-tools.ts        # MCP 工具定义
    ├── status-manager.ts   # 状态管理
    ├── ui-components.ts    # UI 组件
    ├── sidebar.ts          # 侧边栏面板
    └── utils.ts            # 工具函数
```
