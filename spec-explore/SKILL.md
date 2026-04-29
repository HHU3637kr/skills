---
name: spec-explore
description: >
  Spec 创建前的信息收集与探索。由角色 spec-explorer 调用。
  触发条件：(1) 角色 spec-explorer 需要在 Spec 创建前收集背景信息，
  (2) 需要检索历史经验（exp-search），
  (3) 需要探索项目代码库、外部文档或第三方库，
  (4) TeamLead 通知 spec-explorer 开始工作。
---

# Spec Explore

## 核心原则

1. **探索在先**：在 spec-writer 撰写 writer/plan.md 之前完成，为 spec-writer 和 spec-tester 提供充分背景
2. **条件性 exp-reflect**：仅探索新内容时才调用 exp-reflect，纯检索已有经验时不调用
3. **explorer 目录归属**：探索产物固定写入当前 Spec 目录的 `explorer/exploration-report.md`

## exp-reflect 触发条件

| 情况 | 是否触发 exp-reflect |
|------|---------------------|
| 调用 exp-search 检索已有经验 | ❌ 不触发 |
| 探索项目现有代码库 | ✅ 触发（知识记忆） |
| 探索外部代码库（如第三方库） | ✅ 触发（知识记忆） |
| 阅读外部技术文档 | ✅ 触发（知识记忆） |

## 工作流程

### 步骤 1：接收任务

从 TeamLead 的启动指令中获取：
- 当前任务描述
- 需要探索的范围（项目代码、外部库、文档等）
- 当前 Spec 目录
- `explorer/exploration-report.md` 的保存路径

### 步骤 2：检索历史经验

```bash
/exp-search <关键词>
```

以任务关键词检索，阅读相关经验，记录可参考的历史解决方案。

### 步骤 3：探索项目现状

根据任务需要，探索相关代码：
- 使用 `Grep` 查找相关代码模式
- 使用 `Read` 阅读关键文件
- 使用 `Glob` 了解目录结构

> [!tip] 探索完成后触发 exp-reflect
> 探索项目代码后，将新发现调用 exp-reflect 沉淀为知识记忆。

### 步骤 4：探索外部资源（如需要）

探索外部代码库（如 AgentScope、第三方库）或技术文档。

> [!tip] 探索完成后触发 exp-reflect
> 探索外部资源后，调用 exp-reflect 将关键发现沉淀为知识记忆。

### 步骤 5：产出 explorer/exploration-report.md

在当前 Spec 目录下创建 `explorer/exploration-report.md`：

```markdown
# 探索报告

## 检索到的历史经验
[exp-search 结果摘要，含经验链接]

## 项目现状分析
[相关代码/模块的理解：当前实现、接口、数据结构]

## 外部知识
[探索外部库/文档的关键发现]

## 对 Spec 创建的建议
[给 spec-writer 和 spec-tester 的参考信息：
- 建议的实现方向
- 已知的边界情况和风险
- 可复用的现有组件]
```

### 步骤 6：向 TeamLead 提交探索完成通知

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在 `Task Progress` 中追加或更新 spec-explorer 自己的任务行
- `status` 标记为 `done`
- `artifact` 指向 `explorer/exploration-report.md`
- `completed_at` 使用当前时间，`updated_by` 写 `spec-explorer`
- 只修改 `Task Progress`，不要修改 TeamLead 控制面区块

```text
通知 TeamLead：
- explorer/exploration-report.md 已完成，路径：{路径}
- 建议下游角色：spec-writer、spec-tester
- 需要传递给下游的重点风险/边界：[简述]
```

## 与其他角色的协作

```
TeamLead → spec-explorer 开始
spec-explorer → exp-search（检索） + 代码探索 + 外部资源探索
spec-explorer → explorer/exploration-report.md
spec-explorer → TeamLead → spec-writer / spec-tester
```

## 后续动作

完成探索后确认：
1. `explorer/exploration-report.md` 已在正确路径创建
2. 探索新内容后已调用 exp-reflect 沉淀知识
3. 已更新 `lead/team-context.md` 的 `Task Progress` 中自己的任务行
4. 已向 TeamLead 提交探索完成通知，并声明建议分发给 spec-writer 和 spec-tester

### 常见陷阱
- 调用 exp-search 后误触发 exp-reflect（不应触发）
- `explorer/exploration-report.md` 内容太简略，spec-writer 缺少背景信息
- 未在交接中声明 spec-tester，导致 TeamLead 未及时启动测试计划角色
