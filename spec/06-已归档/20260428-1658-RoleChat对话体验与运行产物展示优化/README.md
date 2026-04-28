---
title: RoleChat对话体验与运行产物展示优化
type: spec-index
category: 06-已归档
status: 已归档
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - vscode-extension
  - role-chat
  - agent-timeline
  - claude-code
---

# RoleChat对话体验与运行产物展示优化

## 目标

将 R&K Flow 的 Role Chat 从纯文本聊天框升级为结构化 Agent Timeline，统一展示：

- 用户消息
- Agent 回复
- plan / todo / 阶段步骤
- 工具调用与工具结果
- shell 命令、文件读写、diff、测试结果、打包产物
- 错误、重试、权限和阻塞状态
- TeamBus 协议块的友好展示

体验目标参考 Claude / Claude Code 的对话体验，但不复制或依赖 Claude Code 私有源码、私有 Webview 或内部状态。

## 当前阶段

- 阶段一：需求方向已确认
- 阶段二：探索已完成
- 阶段三：详细设计已完成
- 阶段四：实现与测试已完成
- 阶段五：收尾讨论已完成，已归档

## 文档

- [[team-context|团队上下文]]
- [[exploration-report|探索报告]]
- [[plan|设计方案]]
- [[test-plan|测试计划]]
- [[summary|实现总结]]
- [[test-report|测试报告]]
- [[end-review|收尾讨论]]

## 代码范围

```text
rk-flow-vscode-extension/
```
