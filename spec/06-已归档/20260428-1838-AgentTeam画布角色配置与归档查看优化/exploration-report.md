---
title: AgentTeam画布角色配置与归档查看优化探索报告
type: exploration-report
category: 02-技术设计
status: 已完成
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - exploration
  - vscode-extension
  - agent-team-canvas
  - archive-viewer
---

# 探索报告

## 1. 用户需求归纳

本次需求来自产品原型和插件自测反馈：

- `Spec Directory` 中归档 Spec 应可见，不能因为移动到 `06-已归档` 就从插件 UI 消失。
- 归档 Spec 应进入只读复盘模式，而不是继续运行旧 AgentTeam。
- Spec Directory 当前没有展示全部 Spec，不能只依赖 `plan.md` 扫描。
- 右侧 Role Chat 是聊天区域，不应放置 Role 选择器和模型选择器。
- Role 是 Canvas 上的 Agent 节点，当前聊天对象应通过点击节点选择。
- backend/model/system prompt 属于 Role 节点配置，应放在 Canvas 中选中节点后的属性面板里，类似 Dify 的节点配置体验。

## 2. 已有原型

已创建 HTML 原型：

- `prototypes/spec-archive-viewer.html`
- `prototypes/spec-archive-viewer-preview.png`

原型验证了以下产品方向：

- Active / Archived 分组。
- Archived Spec Archive Viewer。
- Canvas 中 Selected Role 配置面板。
- Role Chat composer 移除 Role/Model 下拉。
- Active 模式 editable，Archived 模式 read-only。

## 3. 代码现状

### 3.1 Spec 扫描

文件：`rk-flow-vscode-extension/src/specs/specRepository.ts`

当前通过 `spec/**/plan.md` 查找 Spec，因此只能发现存在 `plan.md` 的目录。

不足：

- 目录存在但缺少 `plan.md` 时不会显示。
- 运行产物、草稿目录、历史迁移目录可能被静默漏掉。
- `SpecBinding` 没有生命周期字段。
- `SpecBinding` 没有健康状态字段，无法表达 `missing plan` / `incomplete`。
- Tree UI 没有按 active/archived 分组。

### 3.2 Spec Directory

文件：`rk-flow-vscode-extension/src/extension.ts`

当前 `SpecExplorerProvider.getChildren()` 直接返回扁平 `SpecItem[]`。

需要新增：

- 分组节点。
- Active / Archived 二级结构。
- Archived icon 与 description。

### 3.3 Canvas

文件：`rk-flow-vscode-extension/src/extension.ts`

当前 `renderCanvasHtml()` 已支持：

- Agent 节点显示。
- 画布拖拽。
- 画布缩放。
- 点击 Role 节点通知扩展。
- checkout branch。
- request implementation phase。

需要新增：

- Selected Role 属性面板。
- backend/model/system prompt 展示。
- active/archived 权限状态。
- archived 下只读行为。

### 3.4 Role Chat

文件：`rk-flow-vscode-extension/src/roleChat/renderRoleChatHtml.ts`

当前 composer 中仍包含：

- `#role` select。
- `#model` select。

这与产品语义冲突。应移除两个 select，并让 Canvas 选中节点成为当前 Role 的唯一入口。

## 4. 相关风险

- Spec Directory 改成分组后，测试和命令注册可能需要更新。
- Role Chat 移除 `model` 字段后，扩展侧 message handler 必须兼容 `model` 缺省。
- Archived Spec 的只读状态要在 UI 和 Runtime 层同时兜底。
- 当前工作区存在插件运行产生的 runtime/audit 文件，实施时需要区分代码改动与运行产物。

## 5. 建议实现顺序

1. 先做 Spec 目录扫描模型，保证所有符合命名规范的 Spec 都能进入列表。
2. 增加生命周期和健康状态，再做 Spec Directory 分组。
3. 再做 Canvas 角色配置面板。
4. 再移除 Role Chat composer 的 Role/Model 选择器。
5. 最后补充 archived 只读策略与测试。
