---
title: 修复总结-Canvas顶部按钮冗余与Inspector常驻占用空间
type: debug-fix
category: 02-技术设计
status: 未确认
created: 2026-04-29
plan: "[[plan]]"
debug: "[[debug-002]]"
tags:
  - spec
  - debug-fix
  - vscode-extension
  - agent-team-canvas
---

# 修复总结：Canvas顶部按钮冗余与Inspector常驻占用空间

## 1. 修复范围

本次修复 `debug-002.md` 中记录的 Canvas 产品交互问题：

- 移除 Canvas 顶部常驻操作按钮。
- Role Config inspector 默认不展开。
- 点击 Agent 节点后才打开 inspector。
- inspector 可关闭，关闭后画布恢复主区域。

## 2. 修改的文件

```text
rk-flow-vscode-extension/src/
├── extension.ts
└── test/suite/extension.test.ts
```

## 3. 关键修改

### 3.1 移除顶部按钮

从当前 Canvas header 中移除：

- `Checkout Spec Branch`
- `Request Implementation Phase`

保留 Spec 标题作为轻量上下文。

### 3.2 Inspector 默认关闭

修改前：

```css
.workspace {
  grid-template-columns: minmax(420px, 1fr) minmax(300px, 360px);
}
```

修改后：

```css
.workspace {
  grid-template-columns: minmax(420px, 1fr);
}

.workspace.inspectorOpen {
  grid-template-columns: minmax(420px, 1fr) minmax(300px, 360px);
}

.inspector {
  display: none;
}

.workspace.inspectorOpen .inspector {
  display: block;
}
```

### 3.3 点击角色打开 Inspector

`selectAgent()` 现在会打开 inspector：

```ts
workspace.classList.add("inspectorOpen");
```

### 3.4 Inspector 可关闭

新增关闭按钮：

```html
<button id="closeInspector" class="closeInspector">×</button>
```

关闭时：

- 移除 `inspectorOpen`。
- 取消所有 Agent 节点选中态。

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

请重新验证：

- 打开 Canvas 时，顶部不再显示 `Checkout Spec Branch` 和 `Request Implementation Phase`。
- 打开 Canvas 时，右侧 inspector 默认不展开。
- 点击任意 Agent 节点后，右侧 inspector 展开并显示对应 Role 配置。
- 点击 inspector 关闭按钮后，右侧 inspector 收起，节点取消选中。
- 关闭 inspector 后，画布区域恢复主要空间。
- 点击 Agent 节点仍会同步右侧 Role Chat 当前角色。

## 6. 通知

```text
To: spec-tester
Subject: Canvas inspector default-collapsed behavior fixed

debug-002 已修复，请重新验证 Canvas 顶部按钮移除、Role inspector 点击后展开、关闭后收起，以及 Role Chat 同步切换是否正常。
```
