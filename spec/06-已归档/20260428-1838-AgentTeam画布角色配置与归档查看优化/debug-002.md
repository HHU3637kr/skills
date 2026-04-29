---
title: 问题诊断-Canvas顶部按钮冗余与Inspector常驻占用空间
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

# 问题诊断：Canvas顶部按钮冗余与Inspector常驻占用空间

## 1. 问题现象

在 `debug-001` 将浮层配置面板改为右侧 inspector 后，端侧自测发现新的交互问题：

- Canvas 顶部仍常驻 `Checkout Spec Branch` 与 `Request Implementation Phase` 两个按钮，占用主操作区。
- 右侧 Role Config inspector 默认展开，占用画布宽度。
- 用户期望只有点击某个角色节点时才打开角色配置。
- inspector 应可以关闭，关闭后画布恢复为主要操作区域。

## 2. 预期行为

- AgentTeam Canvas 默认只展示画布与节点。
- 顶部仅保留 Spec 标题，不常驻分支切换和阶段请求按钮。
- 点击角色节点后打开右侧 inspector，并展示该角色的 backend、model、system prompt。
- inspector 右上角提供关闭按钮。
- 关闭 inspector 后，画布区域自动恢复完整宽度。

## 3. 根因分析

`debug-001` 修复了“覆盖遮挡”问题，但 inspector 仍被设计为常驻两列布局：

```css
.workspace {
  grid-template-columns: minmax(420px, 1fr) minmax(300px, 360px);
}
```

这解决了遮挡，但没有解决“默认占用画布空间”的产品问题。

顶部按钮则是沿用早期 Canvas 的 phase/git 操作入口，没有随当前产品方向收敛。当前产品语义中，Canvas 应优先表达 AgentTeam 编排和 Role 配置，Git/phase 操作不应作为画布顶部常驻主按钮。

## 4. 修复方案

1. 移除 Canvas header 中的 `Checkout Spec Branch` 和 `Request Implementation Phase` 按钮。
2. `workspace` 默认单列布局。
3. 只有点击 `.agent` 节点时，给 `workspace` 加上 `inspectorOpen` class。
4. `inspector` 默认隐藏，打开时显示为右侧固定面板。
5. inspector 增加关闭按钮 `Close`，点击后移除 `inspectorOpen` 并取消节点选中。
6. 保留 role select 后通知 Role Chat 的行为。

## 5. 与 plan.md 的关系

- 不修改 `plan.md`。
- 修复仍属于 Canvas Role 配置面板的交互调整。
- 本次不新增新的配置持久化能力。
