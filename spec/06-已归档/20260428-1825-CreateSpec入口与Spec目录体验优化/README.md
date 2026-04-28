---
title: CreateSpec入口与Spec目录体验优化
type: spec
category: 02-技术设计
status: 已实现待确认
priority: 高
created: 2026-04-28
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - vscode-extension
  - rk-flow
related:
  - "[[plan|实现计划]]"
  - "[[test-plan|测试计划]]"
---

# CreateSpec入口与Spec目录体验优化

## 需求理解

用户希望 R&K Flow VS Code 扩展补齐项目级 Spec 创建入口，并优化左侧导航结构：

- 不走 MVP，直接完成完整能力。
- `Spec Explorer` 命名改为英文风格但更准确的 `Spec Directory`。
- 提供 `Create Spec` 命令和清晰 UI 入口。
- 左侧不再用大块空间展示 `Agent Adapters`。
- Adapter 状态移动到底部状态栏。
- 左侧腾出的空间用于展示当前 Spec 目录下的文件树。
- 新建 Spec 后应能进入标准 AgentTeam Canvas 与 Role Chat 工作流。

## 当前约束

- 当前扩展只保留 Claude Code 后端。
- 需要保留未来接入其他 CLI 的 Adapter 抽象。
- 不影响现有 Role Chat、Team Chatroom、Canvas、TeamBus 行为。
- 工作区已有旧 Spec 运行日志变更，本次实现不主动回滚或混入无关提交。

## 阶段状态

- 阶段一：需求对齐完成。
- 阶段二：设计与测试计划完成。
- 阶段三：实现完成。
- 阶段四：自动化测试与打包验证通过。
