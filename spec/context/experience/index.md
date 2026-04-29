---
title: 经验记忆索引
type: index
updated: 2026-04-29
---

# 经验记忆索引

> 此文件由 exp-write 自动维护，记录所有经验记忆的摘要。
> 详情按需检索，避免占用过多 context window。

> 使用 `/exp-search <关键词>` 检索相关经验

## 索引表

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 |
|----|------|--------|----------|-----------|
| EXP-001 | Windows下CLI调用避免Shell拼接 | Windows, CLI, spawn, Claude Code, Codex, shim | VS Code 扩展或 Node.js 进程需要在 Windows 下稳定调用 Claude Code / Codex CLI | 解析真实可执行文件并用 `spawn(..., shell:false)` 传参 |
| EXP-002 | Agent私聊与团队通信日志分离 | AgentTeam, TeamBus, agent-chat, team-chat, audit-log | 多角色 Agent 产品同时支持用户私聊和角色间协作 | 私聊写 `agent-chat.jsonl`，团队通信写 `team-chat.jsonl`，审计写 `audit-log.jsonl` |
| EXP-003 | 第三方扩展不可作为编排协议 | VS Code Extension, Claude Code, Chat API, TeamBus, Role Chat, 编排协议 | 需要把第三方 Agent 工具接入自有多角色编排产品时 | 只依赖公开 API；编排、审计和会话边界保留在自有协议中 |
| EXP-004 | TeamBus投递消费回复三段语义 | TeamBus, mailbox, requiresResponse, RoleRuntime, AgentTeam, 消息队列 | 设计或调试多角色 AgentTeam 通信协议时 | 将投递、消费、回复拆开；requiresResponse 只控制回复义务 |
| EXP-005 | 测试不得污染真实Spec目录 | VS Code Extension, 自动化测试, Spec, 临时目录, 测试隔离, JSONL | 为会写入工作区文档的扩展编写自动化测试时 | 写入类测试使用临时 SpecBinding，只读发现类测试才读取真实 Spec |

## 分类索引

### 工具调用

- [EXP-001] Windows下CLI调用避免Shell拼接

### AgentTeam 架构

- [EXP-002] Agent私聊与团队通信日志分离
- [EXP-003] 第三方扩展不可作为编排协议
- [EXP-004] TeamBus投递消费回复三段语义

### 测试工程

- [EXP-005] 测试不得污染真实Spec目录
