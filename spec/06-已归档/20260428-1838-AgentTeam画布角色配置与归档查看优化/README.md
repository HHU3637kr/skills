---
title: AgentTeam画布角色配置与归档查看优化
type: spec
category: 02-技术设计
status: active
priority: 中
created: 2026-04-28
updated: 2026-04-29
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
  - vscode-extension
  - agent-team-canvas
  - archive-viewer
related:
  - "[[plan|实现计划]]"
  - "[[test-plan|测试计划]]"
  - "[[exploration-report|探索报告]]"
---

# AgentTeam画布角色配置与归档查看优化

## 背景

该 Spec 由原 `画布效果优化` 草稿重命名而来。新的目标更明确：优化 R&K Flow VS Code 扩展中 AgentTeam Canvas、Role Chat、Spec Directory 与归档 Spec 查看体验。

当前用户反馈集中在两点：

- 右侧 Role Chat 的职责应是“和当前选中 Role 对话”，不应放置 Role 选择器和模型选择器。
- Role 的模型后端、提示词、运行配置应属于画布节点配置，类似 Dify 中选中节点后编辑节点属性。
- 已归档 Spec 不应从插件 UI 消失，而应以只读历史视图展示 AgentTeam 画布、Role Chat、Team Chatroom、审计日志和运行快照。

## 当前 Spec

- ID: `20260428-1838`
- 目录: `spec/02-技术设计/20260428-1838-AgentTeam画布角色配置与归档查看优化`
- Git 分支: `feat/spec-20260428-1335-rk-flow-vscode-extension`

## 阶段状态

- 阶段一：需求对齐进行中
- 阶段二：已形成探索报告、计划草案和测试计划草案
- 阶段三：等待用户确认后开始实现
