---
id: EXP-005
title: 测试不得污染真实Spec目录
keywords: [VS Code Extension, 自动化测试, Spec, 临时目录, 测试隔离, JSONL]
scenario: 为 R&K Flow 这类会写入工作区文档的扩展编写自动化测试时
created: 2026-04-29
---

# 测试不得污染真实Spec目录

## 困境

R&K Flow 的自动化测试一开始复用了真实归档 Spec 目录，测试运行会向 `team-chat.jsonl`、`audit-log.jsonl`、`runtime.json`、`team-mailboxes/` 写入测试数据。这样会污染历史 Spec，导致 git 工作区出现与功能无关的变更，也会破坏归档文档的可信度。

## 策略

1. 测试写入类能力时，使用 `fs.mkdtemp()` 创建临时 Spec 目录。
2. 只在只读发现类测试中读取真实工作区，例如 `SpecRepository` 是否能发现已有 Spec。
3. TeamBus、RuntimeStore、TimelineStore 等会写文件的模块测试必须绑定临时 `SpecBinding`。
4. 如果测试误写真实目录，立即清理新增 JSONL 行、runtime 文件和 mailbox 目录，并把测试改为隔离目录后重跑。

## 理由

Spec 文档本身是项目知识资产和审计记录。测试污染会让“历史记录”和“测试副作用”混在一起，降低可追溯性。临时目录测试能保留文件读写真实性，同时避免改动真实 Spec。

## 相关文件

- `rk-flow-vscode-extension/src/test/suite/extension.test.ts`
- `rk-flow-vscode-extension/src/teamBus/fileTeamBus.ts`
- `rk-flow-vscode-extension/src/runtime/runtimeStore.ts`
- `spec/06-已归档/20260428-1904-智能体团队运行时生命周期与后端加载设计/test-report.md`

## 参考

- `spec/06-已归档/20260428-1904-智能体团队运行时生命周期与后端加载设计/test-report.md`
