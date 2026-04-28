---
title: CreateSpec入口与Spec目录体验优化团队上下文
type: team-context
category: 02-技术设计
status: active
created: 2026-04-28
---

# Team Context

## Team

- TeamLead：当前 Codex 会话
- spec-explorer：由 TeamLead 本地执行探索职责
- spec-writer：由 TeamLead 本地执行计划撰写职责
- spec-tester：由 TeamLead 本地执行测试计划与验证职责
- spec-executor：由 TeamLead 本地执行实现职责
- spec-debugger：按测试结果触发
- spec-ender：等待用户确认后触发

## Scope

全量实现 R&K Flow VS Code 扩展的新建 Spec 入口与左侧导航体验优化。

## Decisions

- 主命令 ID 使用 `rkFlow.createSpec`。
- 左侧视图显示名改为 `Spec Directory`。
- 左侧新增 `Current Spec Files`，跟随当前 active Spec。
- `Agent Adapters` 从 Activity Bar 视图移除，改为状态栏入口。
- 新建 Spec 生成可被 `SpecRepository` 发现的 `plan.md`，同时创建运行所需 JSONL 文件和 `AgentTeam.canvas` 占位文件。

