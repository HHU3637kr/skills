---
title: CreateSpec入口与Spec目录体验优化实现总结
type: summary
category: 02-技术设计
status: 已实现待确认
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
related:
  - "[[plan|实现计划]]"
  - "[[test-report|测试报告]]"
---

# Summary

## 已实现

- 新增 `rkFlow.createSpec` 命令。
- 在 `Spec Directory` 标题栏注册新建 Spec 入口。
- 将左侧视图名称从 `Spec Explorer` 改为 `Spec Directory`。
- 移除左侧 `Agent Adapters` 视图贡献。
- 新增 `Current Spec Files` 左侧文件树，跟随当前 active Spec。
- 新增状态栏 Adapter 状态入口，显示 Claude Code 可用性。
- 新增 `src/specs/specCreator.ts`，负责创建完整 Spec 骨架。
- 扩展 Git 绑定能力，支持创建并切换 Spec 分支。
- 将扩展版本提升到 `0.0.12`。

## 新建 Spec 产物

`Create Spec` 会创建：

- `README.md`
- `plan.md`
- `test-plan.md`
- `team-context.md`
- `AgentTeam.canvas`
- `team-chat.jsonl`
- `agent-chat.jsonl`
- `agent-timeline.jsonl`
- `audit-log.jsonl`
- `logs/`
- `agent-sessions/`

## 打包产物

- `rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.12.vsix`

