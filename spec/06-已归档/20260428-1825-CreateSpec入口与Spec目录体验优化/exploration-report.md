---
title: CreateSpec入口与Spec目录体验优化探索报告
type: exploration-report
category: 02-技术设计
status: 已完成
created: 2026-04-28
---

# Exploration Report

## 现有结构

- 扩展入口集中在 `rk-flow-vscode-extension/src/extension.ts`。
- `SpecRepository` 通过 `spec/**/plan.md` 发现 Spec。
- `SpecBinding` 当前包含 id、title、category、status、phase、specDir、planPath、gitBranch 等字段。
- 左侧当前注册两个 TreeView：`rkFlow.specExplorer` 和 `rkFlow.agentAdapters`。
- Role Chat 是右侧 WebviewView：`rkFlow.agentChat`。
- Team Chatroom 是底部 Panel WebviewView：`rkFlow.teamChatroom`。
- Canvas 点击角色已经路由到 `rkFlow.selectAgentRole`。

## 问题

- 没有 `createSpec` 命令和 UI 入口。
- `Spec Explorer` 命名偏通用，不符合产品语义。
- `Agent Adapters` 占用左侧主空间，但其信息更适合状态栏。
- 没有当前 Spec 文件树，用户无法在 R&K Flow 视图内快速打开当前 Spec 的文档和日志。
- 新建 Spec 若不创建 `plan.md`，无法被当前 `SpecRepository` 发现。

## 实现入口

- `package.json` 需要新增命令、菜单、激活事件和新视图。
- `extension.ts` 需要新增 `SpecFilesProvider`、`AdapterStatusBar`、`createSpec` 命令处理。
- 新建 Spec 的目录写入逻辑建议单独放入 `src/specs/specCreator.ts`。
- Git 分支创建建议扩展 `GitBindingManager`，支持 `switch -c` 和安全探测。

