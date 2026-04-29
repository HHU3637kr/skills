---
title: extension入口模块化重构
type: spec
category: 02-技术设计
status: draft
priority: 中
created: 2026-04-29
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
tags:
  - spec
related:
  - "[[plan|实现计划]]"
  - "[[test-plan|测试计划]]"
---

# extension入口模块化重构

## 背景

`rk-flow-vscode-extension/src/extension.ts` 已膨胀到约 2300 行，混合 Provider、Webview HTML、Role Prompt、TeamBus 调度、命令注册和运行时控制。后续继续迭代会放大修改冲突和回归风险。

## 目标

- 将入口文件拆分为 providers、webviews、controllers、prompts、commands 等模块。
- 保持现有插件行为和测试入口兼容。
- 完成编译、自动化测试和 VSIX 打包验证。

## 非目标

- 不做 Marketplace 发布加固。
- 不引入新产品功能。
- 不改变 AgentTeam、Role Chat、TeamBus 当前运行语义。

