---
title: extension入口模块化重构探索报告
type: exploration-report
category: 02-技术设计
status: 已完成
created: 2026-04-29
tags:
  - spec
  - exploration
---

# 探索报告

## 项目现状分析

- `src/extension.ts` 目前承担激活入口、Provider、Webview HTML、Role Chat 控制器、Team Chatroom 控制器、Canvas 命令、Spec 创建命令、Adapter 状态和 Prompt 构造。
- 已存在 `agentAdapters/`、`roleChat/`、`runtime/`、`specs/`、`teamBus/` 等基础模块，适合继续沿这个边界拆分。
- 测试仍从 `../../extension` 导入部分工具函数，因此重构时需要保留 re-export 兼容层。

## 建议实现方向

- `extension.ts` 缩减为依赖装配和命令注册入口。
- Provider 移入 `src/providers/`。
- Canvas 和 TeamChatroom HTML renderer 移入 `src/webviews/`。
- Role prompt 和 skill routing 移入 `src/prompts/`。
- Role Chat 与 Team Chatroom 编排移入 `src/controllers/`。
- Create Spec 和 Canvas 相关命令移入 `src/commands/`。

## 风险

- Webview 字符串迁移容易引入转义错误。
- Controller 拆分后容易出现循环依赖，需要用公共 role 工具和 prompt 模块打断。
- 现有测试依赖 extension 公开导出，必须保留兼容 re-export。

