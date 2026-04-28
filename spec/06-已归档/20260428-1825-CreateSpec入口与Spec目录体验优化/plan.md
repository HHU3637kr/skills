---
title: CreateSpec入口与Spec目录体验优化
type: plan
category: 02-技术设计
status: 已实现待确认
priority: 高
created: 2026-04-28
execution_mode: single-agent
git_branch: feat/spec-20260428-1335-rk-flow-vscode-extension
base_branch: master
pr_url:
tags:
  - spec
  - plan
  - vscode-extension
related:
  - "[[exploration-report|探索报告]]"
  - "[[test-plan|测试计划]]"
---

# CreateSpec入口与Spec目录体验优化

## 1. 目标

实现完整的新建 Spec 体验与左侧导航重构：

- 新增 `R&K Flow: Create Spec` 命令。
- 在 `Spec Directory` 标题栏提供新建入口。
- 创建 Spec 目录、基础文档、JSONL 运行文件和 `AgentTeam.canvas`。
- 支持可选创建/切换 Spec Git 分支。
- 将左侧 `Spec Explorer` 显示名改为 `Spec Directory`。
- 移除左侧 `Agent Adapters` TreeView。
- 新增左侧 `Current Spec Files` 文件树。
- 将 Adapter 状态移动到 VS Code 状态栏。

## 2. 非目标

- 不重新实现 Agent 后端。
- 不重新设计 Role Chat UI。
- 不改变 TeamBus 协议。
- 不恢复 Codex CLI 支持。

## 3. 模块设计

### 3.1 SpecCreator

新增 `src/specs/specCreator.ts`：

- 输入标题、分类、是否创建分支、当前分支信息。
- 生成 `YYYYMMDD-HHmm-标题` 目录。
- 写入 `README.md`、`plan.md`、`test-plan.md`、`team-context.md`。
- 初始化 `team-chat.jsonl`、`agent-chat.jsonl`、`agent-timeline.jsonl`、`audit-log.jsonl`。
- 创建 `logs/`、`agent-sessions/`。
- 创建 `AgentTeam.canvas` 占位 JSON Canvas 文件。

### 3.2 GitBindingManager

扩展 `src/git/gitBinding.ts`：

- `branchExists(branch)`。
- `createAndCheckoutBranch(branch, baseBranch?)`。
- `defaultBaseBranch()`，优先 `main`，其次 `master`，最后当前分支。

### 3.3 VS Code Contributions

更新 `package.json`：

- 新增 `rkFlow.createSpec`。
- 新增 `rkFlow.showAdapterStatus`。
- `Spec Explorer` 显示名改为 `Spec Directory`。
- 新增 `rkFlow.currentSpecFiles` 视图。
- 移除 `rkFlow.agentAdapters` 视图贡献。
- 在 `view/title` 为 `rkFlow.specExplorer` 添加 `Create Spec` 和 Refresh 按钮。

### 3.4 Current Spec Files

新增 TreeDataProvider：

- 读取 active Spec 的 `specDirFsPath`。
- 展示当前 Spec 目录下的文件和目录。
- 点击文件打开编辑器。
- 创建、打开、刷新 Spec 后同步刷新。

### 3.5 Adapter Status Bar

新增状态栏项：

- 文案示例：`$(check) Claude Code`。
- Tooltip 展示 Claude Code 可用性和 terminal bridge。
- 点击执行 `rkFlow.showAdapterStatus`，弹出详细状态。

## 4. 交互流程

1. 用户点击 `Spec Directory` 标题栏 `+`。
2. 输入中文 Spec 标题。
3. 选择目录分类。
4. 选择 Git 行为：创建并切换新分支、仅绑定当前分支、不绑定。
5. 扩展创建 Spec 文件。
6. 扩展刷新 `Spec Directory` 和 `Current Spec Files`。
7. 扩展打开新 Spec 的 `AgentTeam.canvas`。
8. Role Chat 默认选中 `TeamLead`。

## 5. 验收标准

- 命令面板能找到并执行 `R&K Flow: Create Spec`。
- `Spec Directory` 标题栏有新建入口。
- 新 Spec 能被列表发现。
- 新 Spec 文件树能显示新目录内容。
- Agent Adapters 不再出现在左侧大块视图。
- 状态栏显示 Claude Code Adapter 状态。
- 新建后 Canvas 可打开，Role Chat 可用。
- 自动化测试覆盖命令注册、manifest、Spec 创建和文件树关键逻辑。
