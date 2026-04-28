---
title: 经验记忆索引
type: index
updated: 2026-04-28
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

## 分类索引

### 工具调用

- [EXP-001] Windows下CLI调用避免Shell拼接

### AgentTeam 架构

- [EXP-002] Agent私聊与团队通信日志分离
