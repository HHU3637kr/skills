---
title: 修复总结-Canvas角色配置浮层遮挡画布
type: debug-fix
category: 02-技术设计
status: 未确认
created: 2026-04-29
plan: "[[plan]]"
debug: "[[debug-001]]"
tags:
  - spec
  - debug-fix
  - vscode-extension
  - agent-team-canvas
---

# 修复总结：Canvas角色配置浮层遮挡画布

## 1. 修复范围

本次只修复 `debug-001.md` 记录的 Canvas 布局问题，不修改 `plan.md`，不新增多模型持久化等额外功能。

## 2. 修改的文件

```text
rk-flow-vscode-extension/src/
├── extension.ts
└── test/suite/extension.test.ts
```

## 3. 关键修改

### 3.1 修改前

`renderCanvasHtml()` 将 Spec 信息和 Role 配置作为画布内浮层：

```css
.sideStack {
  position: absolute;
  right: 16px;
  top: 16px;
}
```

该结构导致配置卡遮挡画布节点。

### 3.2 修改后

`renderCanvasHtml()` 改为固定两列布局：

```css
.workspace {
  height: calc(100vh - 42px);
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(300px, 360px);
}

.canvasWrap {
  overflow: hidden;
}

.inspector {
  border-left: 1px solid var(--line);
  overflow: auto;
}
```

新的职责划分：

- `canvasWrap`：只承载 AgentTeam 节点、连线、拖拽和缩放。
- `inspector`：承载 Spec 摘要、Git 状态、Role 配置。
- 点击 Agent 节点后，更新 inspector 中的 selected role config，并继续通知右侧 Role Chat 切换当前 Role。

### 3.3 防回归测试

新增测试：

```text
renders Canvas role config in a fixed inspector instead of overlaying the canvas
```

断言：

- HTML 包含 `workspace`、`canvasWrap`、`inspector`。
- HTML 不再包含 `sideStack`。
- HTML 不再包含覆盖式定位片段 `position: absolute; right: 16px; top: 16px`。

## 4. 验证结果

### 编译

- 命令：`npm run compile`
- 结果：通过

### 自动化测试

- 命令：`npm test`
- 结果：28 passing

### 打包

- 命令：`npm run package`
- 产物：`rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.12.vsix`
- 结果：通过

## 5. 需要 spec-tester 重新验证

请重新验证以下端侧场景：

- 打开 `AgentTeam.canvas` 后，中间画布不再被 Spec 信息和 Role 配置遮挡。
- Spec 信息、Git 状态、Role 配置显示在固定右侧 inspector。
- 拖拽 / 缩放画布仍正常。
- 点击不同 Agent 节点后，inspector 中的 Role、Backend、Model、System Prompt 正确切换。
- 点击不同 Agent 节点后，右侧 Role Chat 仍切换到对应 Role。
- Archived Spec 下 inspector 为只读状态，phase request 不可执行。

## 6. 通知

```text
To: spec-tester
Subject: Canvas inspector layout bug fixed

debug-001 已修复，请重新验证 Canvas 不被 Role 配置浮层遮挡，以及 Role 节点点击、Role Chat 切换、Archived 只读状态是否正常。
```
