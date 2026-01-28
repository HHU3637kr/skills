---
name: exp-write
description: 经验写入 Skill，将经验草稿写入文件并更新索引。触发场景：exp-reflect 确认后、手动添加经验。仅处理经验记忆，程序记忆使用 skill-creator，工具记忆直接编辑 Skill。
allowed-tools: Read, Write, Edit, Glob
model: claude-haiku-4
---

# exp-write - 经验写入 Skill

## 概述

将经验记忆（困境-策略对）写入 `context/experience/` 目录，并更新索引文件。

**注意**：本 Skill 仅处理经验记忆的写入。
- 程序记忆（SOP）→ 使用 `/skill-creator` 创建
- 工具记忆 → 直接编辑目标 Skill 文件末尾

## 触发场景

- `exp-reflect` 用户确认后自动调用
- 手动添加经验：`/exp-write`

## 核心文件

- **经验索引**：`context/experience/index.md`
- **经验详情**：`context/experience/exp-{ID}-{中文标题}.md`

---

## 执行流程

```
写入流程：
- [ ] 步骤 1：确定经验 ID
      读取 index.md，找到最大 ID
      新 ID = 最大 ID + 1
      格式：三位数字，如 001, 002, 003

- [ ] 步骤 2：生成文件名
      格式：exp-{ID}-{slug}.md
      slug：标题的英文/拼音简写，用连字符分隔
      示例：exp-001-websocket-timeout.md

- [ ] 步骤 3：写入经验详情文件
      路径：context/experience/exp-{ID}-{slug}.md
      使用标准模板格式

- [ ] 步骤 4：更新索引文件
      在 index.md 的表格中添加新条目

- [ ] 步骤 5：确认完成
      告知用户经验已保存
      说明如何检索：/exp-search <关键词>
```

---

## 文件格式

### 经验详情文件模板

```markdown
---
id: EXP-{ID}
title: {标题}
keywords: [{关键词1}, {关键词2}, {关键词3}]
scenario: {适用场景}
created: {YYYY-MM-DD}
---

# {标题}

## 困境

{描述遇到的问题或挑战}

## 策略

1. {解决步骤1}
2. {解决步骤2}
3. {解决步骤3}

## 理由

{为什么这个策略有效}

## 相关文件

- {涉及的文件路径1}
- {涉及的文件路径2}

## 参考

- {相关链接或文档}
```

### 索引文件格式 (index.md)

```markdown
# 经验索引

> 使用 `/exp-search <关键词>` 检索相关经验

## 索引表

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 |
|----|------|--------|----------|-----------|
| EXP-001 | WebSocket 连接超时 | WebSocket, 超时, Nginx, 心跳 | 长时间任务连接断开 | 三层防护：Nginx超时+心跳+重连 |
| EXP-002 | 多角色页面一致性 | 多角色, 页面同步, 前端 | 修改共用页面 | 共用页面修改需同步所有角色 |

## 分类索引

### 前端相关
- [EXP-001] WebSocket 连接超时
- [EXP-002] 多角色页面一致性

### 后端相关
- [EXP-003] AgentScope Memory 管理

### 架构决策
- [EXP-004] 记忆系统架构设计
```

---

## 命名规范

### 经验 ID

- 格式：三位数字
- 示例：001, 002, 003
- 递增分配，不重复使用

### 文件名

- 格式：`exp-{ID}-{中文标题}.md`
- 标题使用中文，简短表达主题
- 示例：
  - `exp-001-记忆系统架构设计.md`
  - `exp-002-前端多角色页面一致性.md`
  - `exp-006-AgentScope-Memory管理.md`

---

## 更新模式

当需要更新现有经验时：

```
更新流程：
- [ ] 步骤 1：读取现有经验文件
- [ ] 步骤 2：合并新内容
      - 补充策略步骤
      - 添加新的相关文件
      - 更新理由说明
- [ ] 步骤 3：更新索引（如果关键词或场景变化）
- [ ] 步骤 4：确认完成
```

---

## 输出确认

### 新增经验

```markdown
✅ 经验已保存

**文件**：context/experience/exp-003-agentscope-memory.md
**索引**：已更新 context/experience/index.md

检索方式：
- `/exp-search AgentScope`
- `/exp-search Memory 超限`
```

### 更新经验

```markdown
✅ 经验已更新

**文件**：context/experience/exp-001-websocket-timeout.md
**变更**：
- 新增策略步骤：添加重试机制
- 补充相关文件：backend/utils/retry.py

检索方式：
- `/exp-search WebSocket`
```

---

## 质量检查

写入前自动检查：

| 检查项 | 要求 |
|--------|------|
| 标题 | 简短明确，描述问题而非解决方案 |
| 关键词 | 3-6 个，覆盖主要概念 |
| 适用场景 | 一句话描述何时使用 |
| 困境 | 清晰描述问题背景 |
| 策略 | 具体可执行的步骤 |
| 理由 | 解释为什么有效 |

---

## 与其他 Skill 的协作

| 场景 | 协作 Skill |
|------|-----------|
| 接收经验草稿 | ← `/exp-reflect` 生成 |
| 写入后验证 | → `/exp-search` 测试检索 |
