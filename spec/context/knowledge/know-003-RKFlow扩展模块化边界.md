---
id: KNOW-003
title: RKFlow扩展模块化边界
type: 项目理解
keywords: [R&K Flow, VS Code Extension, extension.ts, providers, webviews, controllers, prompts, commands]
created: 2026-04-29
---

# RKFlow扩展模块化边界

## 概述

R&K Flow VS Code 扩展的入口文件已经从“大入口文件”拆分为按职责组织的模块。`src/extension.ts` 现在主要负责 VS Code 激活、依赖装配、命令注册和兼容 re-export。

## 模块边界

| 目录 | 职责 |
|---|---|
| `src/providers/` | VS Code TreeDataProvider，负责 Spec Directory 与 Current Spec Files |
| `src/webviews/` | Webview HTML renderer，负责 AgentTeam Canvas 与 Team Chatroom 展示 |
| `src/controllers/` | 运行时业务控制，负责 Role Chat、Team Chatroom、Adapter 状态 |
| `src/prompts/` | Role prompt、Skill routing、TeamBus prompt |
| `src/commands/` | Create Spec、AgentTeam Canvas、Git checkout 等命令处理 |
| `src/common/` | 跨模块共享的小型工具，如 role 判定和 HTML escape |

## 兼容策略

- `src/extension.ts` 继续 re-export 测试和外部调用依赖的工具函数：
  - `buildRolePrompt`
  - `canvasPanelKey`
  - `readableEventText`
  - `renderCanvasHtml`
  - `renderTeamChatroomHtml`
  - `roleDefinitionFor`
  - `shouldRouteTeamMessage`
- Webview 与 Controller 不互相持有 HTML 字符串实现细节，Controller 只调用 renderer。
- Prompt 逻辑不依赖 Webview 或 Controller，避免循环依赖。

## 相关文件

- `rk-flow-vscode-extension/src/extension.ts`
- `rk-flow-vscode-extension/src/providers/specExplorerProvider.ts`
- `rk-flow-vscode-extension/src/providers/currentSpecFilesProvider.ts`
- `rk-flow-vscode-extension/src/webviews/canvasWebview.ts`
- `rk-flow-vscode-extension/src/webviews/teamChatroomWebview.ts`
- `rk-flow-vscode-extension/src/controllers/agentChatController.ts`
- `rk-flow-vscode-extension/src/controllers/teamChatroomController.ts`
- `rk-flow-vscode-extension/src/prompts/rolePrompts.ts`
- `rk-flow-vscode-extension/src/commands/createSpecCommand.ts`
- `rk-flow-vscode-extension/src/commands/agentTeamCanvasCommand.ts`

