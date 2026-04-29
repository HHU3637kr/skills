---
title: 问题诊断-Canvas角色配置浮层遮挡画布
type: debug
category: 02-技术设计
status: 已确认
severity: 中
created: 2026-04-29
plan: "[[plan]]"
tags:
  - spec
  - debug
  - vscode-extension
  - agent-team-canvas
---

# 问题诊断：Canvas角色配置浮层遮挡画布

## 1. 问题现象

用户在端侧自测中打开 `AgentTeam.canvas` 后，Canvas 中的 Spec 信息和 Selected Role Config 以浮动卡片形式覆盖在画布上，遮挡 Agent 节点与连线。

具体表现：

- Spec 信息卡覆盖画布右上区域。
- Role 配置卡覆盖画布中部和下部。
- Agent 节点被配置表单遮挡，视觉上不再像可操作的 AgentTeam 编排画布。
- 画布主体和属性配置的职责边界混在一起。

## 2. 复现步骤

1. 安装当前打包的 `rk-flow-vscode-extension-0.0.12.vsix`。
2. 打开任意 Spec。
3. 点击 `AgentTeam.canvas`。
4. 观察画布右侧和中部的 Spec 信息卡、Role 配置卡是否遮挡节点。

## 3. 预期行为

- 中间区域应是干净的 AgentTeam Canvas，节点和连线是主体。
- Role 配置应放在固定 inspector 面板中，而不是覆盖在画布上。
- Spec / Git / lifecycle / health 信息应压缩到 toolbar 或 inspector 中，不应以大浮层遮挡画布。
- 点击节点后更新 inspector 中的 Role 配置，同时通知右侧 Role Chat 切换当前 Role。

## 4. 根因分析

根因是 `renderCanvasHtml()` 的布局实现偏离了产品意图：

```css
.sideStack {
  position: absolute;
  right: 16px;
  top: 16px;
}
```

该实现将 Spec 信息和 Role 配置作为 `canvasWrap` 内的绝对定位浮层渲染。由于画布节点也位于同一空间，浮层天然会遮挡节点。

这是实现偏差，不是 `plan.md` 的目标错误。`plan.md` 要求“Canvas Role 配置面板”，但没有要求该面板必须以覆盖式浮层存在。结合用户确认后的产品语义，正确结构应为：

```text
toolbar
├── canvas stage
└── role inspector
```

## 5. 修复方案

修改 `renderCanvasHtml()`：

1. 将根布局改为 `.workspace` 两列结构：
   - 左侧 `canvasWrap`：只承载画布、节点和连线。
   - 右侧 `inspector`：承载 Spec 摘要、Git 状态、Role 配置。
2. 移除 `.sideStack` 绝对定位浮层。
3. 拖拽逻辑只绑定左侧 `canvasWrap`，不会被 inspector 干扰。
4. 点击 Role 节点后更新 inspector 的 selected role config。
5. 保留 active / archived 的可编辑与只读差异。
6. 增加测试断言，防止再次出现 `sideStack` 覆盖式布局。

## 6. 与 plan.md 的关系

- 不修改 `plan.md`。
- 修复仍属于 `plan.md` 中“Canvas Role 配置面板”和“Role 配置属于 Canvas 侧节点配置”的范围。
- 修复不新增新功能，只调整实现结构，避免 UI 遮挡和职责混杂。

## 7. 确认状态

用户已确认修复方向：

- Canvas 不应被配置卡覆盖。
- 配置面板应固定为右侧 inspector。
- 中间画布保持干净，可用于 AgentTeam 编排。
