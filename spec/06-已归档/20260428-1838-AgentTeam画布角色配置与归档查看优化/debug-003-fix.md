---
title: 修复总结-同一Spec重复打开多个Canvas
type: debug-fix
category: 02-技术设计
status: 未确认
created: 2026-04-29
plan: "[[plan]]"
debug: "[[debug-003]]"
tags:
  - spec
  - debug-fix
  - vscode-extension
  - agent-team-canvas
---

# 修复总结：同一Spec重复打开多个Canvas

## 1. 修复范围

本次修复同一 Spec 重复点击时创建多个 `AgentTeam.canvas` WebviewPanel 的问题。

## 2. 修改的文件

```text
rk-flow-vscode-extension/src/
├── extension.ts
└── test/suite/extension.test.ts
```

## 3. 关键修改

### 3.1 增加 Panel 缓存

新增模块级缓存：

```ts
const agentTeamCanvasPanels = new Map<string, vscode.WebviewPanel>();
```

### 3.2 使用 specDir 作为复用 key

新增 helper：

```ts
export function canvasPanelKey(spec: Pick<SpecBinding, "specDir">): string {
  return spec.specDir;
}
```

使用 `spec.specDir` 而不是 `spec.id`，避免 Active / Archived 中相同时间戳 ID 的 Spec 互相覆盖。

### 3.3 命中缓存时 reveal

创建 panel 前先检查缓存：

```ts
const existingPanel = agentTeamCanvasPanels.get(panelKey);
if (existingPanel) {
  existingPanel.reveal(vscode.ViewColumn.One);
  existingPanel.webview.postMessage({
    type: "branch",
    branch: await safeCurrentBranch(gitBinding)
  });
  return;
}
```

### 3.4 关闭后清理缓存

```ts
panel.onDidDispose(() => {
  agentTeamCanvasPanels.delete(panelKey);
});
```

## 4. 验证结果

### 编译

- 命令：`npm run compile`
- 结果：通过

### 自动化测试

- 命令：`npm test`
- 结果：29 passing

### 打包

- 命令：`npm run package`
- 产物：`rk-flow-vscode-extension/rk-flow-vscode-extension-0.0.12.vsix`
- 结果：通过

## 5. 需要 spec-tester 重新验证

请重新验证：

- 点击同一个 Spec 多次，不再创建多个 `AgentTeam.canvas` Tab。
- 已打开同一 Spec 时，再次点击会回到原有画布。
- 关闭画布后，再次点击该 Spec 能重新创建画布。
- Active / Archived 中同 ID 但不同目录的 Spec 不会复用同一个画布。

## 6. 通知

```text
To: spec-tester
Subject: AgentTeam Canvas panel reuse fixed

debug-003 已修复，请重新验证同一 Spec 重复点击只 reveal 已打开画布，不再重复创建 WebviewPanel。
```
