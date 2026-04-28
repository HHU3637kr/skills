---
title: 问题诊断-工具结果重复显示且未与工具调用成组
type: debug
category: 06-已归档
status: 已确认
severity: 中
created: 2026-04-28
plan: "[[plan]]"
tags:
  - spec
  - debug
  - role-chat
  - agent-timeline
---

# 问题诊断-工具结果重复显示且未与工具调用成组

## 问题现象

Role Chat 中执行 Bash 工具后，工具输出出现两类异常：

1. 工具调用和工具结果是两个独立卡片，视觉上没有被归为同一次工具执行。
2. 同一份工具输出既以 `tool_result` 工具结果卡片出现，又以 `TeamLead` 的 `assistant_message` 气泡再次出现。

## 复现步骤

1. 打开 R&K Flow VS Code 扩展。
2. 选择任意 Spec 的 `AgentTeam.canvas`。
3. 在右侧 Role Chat 中让 `TeamLead` 执行 Bash 命令，例如列出 Spec 目录。
4. 观察工具输出在 timeline 中重复展示。

## 根因分析

Claude Code `stream-json` 中工具结果事件形态如下：

- 工具调用：`payload.type === "assistant"`，`message.content[]` 中包含 `type: "tool_use"`，并带有 `id`。
- 工具结果：`payload.type === "user"`，`message.content[]` 中包含 `type: "tool_result"`，并带有 `tool_use_id` 和 `content`。

当前实现中：

- `mapToolContent()` 会将 `tool_result` 正确映射为 `tool_result` timeline item。
- 随后的通用 `extractText(payload)` 又会从同一个 `tool_result.content` 中提取文本。
- 因此 mapper 会额外生成一条 `assistant_message`，导致工具输出以 TeamLead 回复形式重复出现。
- `ToolCallItem` / `ToolResultItem` 没有保存 `tool_use_id`，渲染层也没有 pairing 逻辑，所以工具调用和工具结果只能顺序展示，无法合并成一个工具执行卡片。

## 修复方案

1. 在 text extraction 边界跳过 `tool_use`、`tool_result`、`thinking` 等非 assistant 可见回复内容。
2. 为 `ToolCallItem` / `ToolResultItem` 增加可选 `toolUseId`。
3. mapper 从 Claude Code 的 `id` / `tool_use_id` 提取 `toolUseId`。
4. 渲染层优先按 `toolUseId`，fallback 按相邻同名工具，将 tool call 和 tool result 合并成一个工具卡片。
5. 增加回归测试，确保 `tool_result` 不生成 `assistant_message`，且工具调用和结果可合并渲染。

## 与 plan.md 的关系

该问题属于实现偏差，不修改 [[plan]]。

`plan.md` 已明确要求：

- 工具调用和工具结果需要专用展示方式。
- 工具输出默认折叠，不能刷屏。
- 不出现重复回复。

本修复保持设计不变，只修正事件映射边界和工具渲染分组。
