---
title: extension入口模块化重构
type: plan
category: 02-技术设计
status: 已确认
priority: 中
created: 2026-04-29
execution_mode: single-agent
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
pr_url:
tags:
  - spec
  - plan
related:
  - "[[exploration-report|探索报告]]"
  - "[[test-plan|测试计划]]"
---

# extension入口模块化重构

## 1. 背景

`src/extension.ts` 体积过大，职责混合，已经成为后续迭代的维护瓶颈。本次只做结构性拆分，保持外部行为不变。

## 2. 目标

- 拆分入口职责，降低 `extension.ts` 文件复杂度。
- 保持现有命令、视图、Webview 行为、测试导入路径兼容。
- 完成编译、测试、打包验证。

## 3. 非目标

- 不做 CSP/nonce、安全发布加固。
- 不做 CLI 配置项、CI、README 产品化补强。
- 不调整 Role 生命周期和 TeamBus 状态机语义。

## 4. 设计方案

### 模块边界

- `src/providers/`
  - `specExplorerProvider.ts`
  - `currentSpecFilesProvider.ts`
- `src/webviews/`
  - `canvasWebview.ts`
  - `teamChatroomWebview.ts`
- `src/controllers/`
  - `agentChatController.ts`
  - `teamChatroomController.ts`
  - `adapterStatus.ts`
- `src/prompts/`
  - `rolePrompts.ts`
- `src/commands/`
  - `createSpecCommand.ts`
  - `agentTeamCanvasCommand.ts`
- `src/common/`
  - `roles.ts`
  - `html.ts`

### 兼容策略

- `src/extension.ts` 保留 `activate/deactivate`。
- 测试依赖的 `buildRolePrompt`、`canvasPanelKey`、`readableEventText`、`renderCanvasHtml`、`renderTeamChatroomHtml`、`roleDefinitionFor`、`shouldRouteTeamMessage` 从新模块 re-export。

## 5. 实现步骤

1. 新增公共 role 与 HTML escape 工具。
2. 移动 Role prompt 和 Skill routing 到 `prompts/rolePrompts.ts`。
3. 移动 Canvas 与 TeamChatroom renderer 到 `webviews/`。
4. 移动 Spec Directory 与 Current Spec Files provider 到 `providers/`。
5. 移动 Role Chat 与 Team Chatroom 控制器到 `controllers/`。
6. 移动 Create Spec、Canvas 打开和 Git checkout 命令到 `commands/`。
7. 将 `extension.ts` 缩减为激活装配层，并保留兼容 re-export。
8. 运行 compile/test/package。

## 6. 风险和依赖

- 依赖现有测试覆盖核心行为。
- 需要防止新增模块之间循环依赖。
- 大字符串迁移后必须通过编译和测试验证。

