---
title: CreateSpec入口与Spec目录体验优化测试计划
type: test-plan
category: 02-技术设计
status: 已验证
created: 2026-04-28
related:
  - "[[plan|实现计划]]"
---

# Test Plan

## 自动化测试

- 扩展激活后应注册 `rkFlow.createSpec`、`rkFlow.showAdapterStatus`、`rkFlow.openAgentTeamCanvas` 等命令。
- Manifest 应包含 `Spec Directory` 和 `Current Spec Files`，不再贡献左侧 `Agent Adapters` 视图。
- `SpecCreator` 应能在临时目录创建完整 Spec 骨架。
- `SpecRepository` 应能发现新建 Spec。
- Git 分支名生成应稳定、可读、避免非法字符。
- 状态栏 Adapter 状态命令可执行且不抛错。

## 端侧测试

- 安装打包 VSIX。
- 打开 skills 工作区。
- 左侧 R&K Flow 显示 `Spec Directory` 与 `Current Spec Files`。
- 点击 `Spec Directory` 标题栏新建按钮创建 Spec。
- 新 Spec 出现在目录列表中。
- 文件树展示该 Spec 下的文档、日志目录和 canvas 文件。
- 新建后自动打开 AgentTeam Canvas。
- 点击 Canvas 上的角色后右侧 Role Chat 切换角色。
- 底部状态栏展示 Claude Code 可用状态。

## 日志保留

- 构建日志写入本 Spec 的 `logs/extension-build.log`。
- 测试日志写入本 Spec 的 `logs/extension-test.log`。
- 打包日志写入本 Spec 的 `logs/extension-package.log`。
