---
title: 问题诊断-同一Spec重复打开多个Canvas
type: debug
category: 02-技术设计
status: 已确认
severity: 中
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - debug
  - vscode-extension
  - agent-team-canvas
---

# 问题诊断：同一Spec重复打开多个Canvas

## 1. 问题现象

用户在 Spec Directory 中多次点击同一个 Spec 时，VS Code 会重复打开新的 `AgentTeam.canvas` 编辑器 Tab，而不是回到已经打开的画布。

## 2. 复现步骤

1. 打开 R&K Flow 的 Spec Directory。
2. 点击任意一个 Spec，打开 `AgentTeam.canvas`。
3. 再次点击同一个 Spec。
4. 观察是否出现第二个同名 `AgentTeam.canvas` Tab。

## 3. 预期行为

- 同一个 Spec 只应有一个 `AgentTeam.canvas` WebviewPanel。
- 再次点击同一 Spec 时，应调用 `panel.reveal()` 回到已有画布。
- 关闭画布后，再点击该 Spec 才重新创建新的 WebviewPanel。
- Active / Archived 中可能存在相同时间戳 ID，因此复用 key 应使用 `spec.specDir`，不能只使用 `spec.id`。

## 4. 根因分析

当前 `openAgentTeamCanvas()` 每次都直接调用：

```ts
vscode.window.createWebviewPanel(...)
```

该 API 会无条件创建新的编辑器 Tab。当前实现没有：

- `spec.specDir -> WebviewPanel` 缓存。
- 打开前检查已有 panel。
- 已打开时调用 `panel.reveal()`。
- panel dispose 后清理缓存。

`retainContextWhenHidden` 只负责隐藏后的 Webview 状态保留，不负责复用同一个 panel。

## 5. 修复方案

1. 增加模块级 `Map<string, vscode.WebviewPanel>`，key 使用 `spec.specDir`。
2. `openAgentTeamCanvas()` 创建新 panel 前先查缓存。
3. 缓存命中时调用 `existing.reveal(vscode.ViewColumn.One)` 并返回。
4. 创建新 panel 后写入缓存。
5. `panel.onDidDispose()` 时删除对应 key。
6. 暴露一个轻量 helper 便于自动化测试复用 key 语义。

## 6. 与 plan.md 的关系

- 不修改 `plan.md`。
- 该问题属于 Canvas 打开生命周期管理的实现缺陷。
- 修复不新增功能，只修正同一 Spec 画布的复用行为。
