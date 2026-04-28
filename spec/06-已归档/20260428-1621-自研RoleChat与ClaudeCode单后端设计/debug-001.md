---
title: 问题诊断-ClaudeCode回复重复显示
type: debug
category: 02-技术设计
status: 已确认
severity: 中
created: 2026-04-28
plan: "[[plan]]"
tags:
  - spec
  - debug
  - vscode-extension
---

# 问题诊断-ClaudeCode回复重复显示

## 问题现象

在 R&K Flow 的 Role Chat 中，向 `TeamLead` 发送消息后，Claude Code 的同一段回复会出现两次。

截图表现：

- 第一条 `TeamLead` 气泡显示正常回复
- 第二条 `TeamLead` 气泡内容完全相同
- 两条消息都表现为 Agent 回复，而不是用户消息或 TeamBus 消息

## 复现步骤

1. 安装并运行 R&K Flow VS Code 扩展
2. 打开任意 Spec 的 `AgentTeam.canvas`
3. 在右侧 `Role Chat` 中选择 `TeamLead`
4. 发送一条普通消息
5. 观察 Claude Code 回复被渲染两次

## 根因分析

Claude Code CLI 的 `--output-format stream-json` 会输出多类事件：

- `assistant`：包含 assistant message 的正文
- `result`：包含最终聚合结果文本和元数据

当前实现中：

- `runAgentMessage()` 对每个 CLI event 调用 `readableEventText(event)`
- `readableEventText()` 会从 payload 的 `message/content/result` 等字段提取文本
- Claude Code 的 `assistant` 事件会被提取一次正文
- Claude Code 的最终 `result` 事件也会因为包含 `result` 字段而再次提取同一段正文
- Webview 收到两次 `agentEvent`，因此追加两个相同气泡

这不是 `agentDone` 分支重复追加造成的，因为前端已经用 `receivedAgentText` 避免在 `agentDone` 时重复追加最终消息。

## 修复方案

在 `readableEventText()` 中识别 Claude Code 的最终 `result` 聚合事件：

- 当 payload 的 `type === "result"` 时返回空字符串
- 保留 assistant message 事件作为唯一可见回复来源
- 最终完整回复仍由 `readableText` 中的 assistant 正文写入 `agent-chat.jsonl`

## 与 plan.md 的关系

该问题属于实现偏差，不需要修改 `plan.md`。

`plan.md` 要求：

- Role Chat 作为用户与单个 AgentRole 的对话入口
- 用户与 Role 的私聊记录写入 `agent-chat.jsonl`
- Team Chatroom 不混入私聊记录

本修复保持以上设计不变，只修正 Claude Code stream-json 事件解析边界。
