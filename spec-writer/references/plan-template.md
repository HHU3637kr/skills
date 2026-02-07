# plan.md 模板与字段参考

## Frontmatter（必须放在文件最开头）

```yaml
---
title: 功能名称
type: plan
category: 03-功能实现
status: 未确认
priority: 高
created: YYYY-MM-DD
execution_mode: single-agent
tags:
  - spec
  - plan
related: []
---
```

### 字段说明

| 字段 | 必填 | 说明 | 可选值 |
|------|------|------|--------|
| `title` | 是 | Spec 标题 | - |
| `type` | 是 | 文档类型 | `plan` |
| `category` | 是 | 分类目录 | `01-项目规划`/`02-架构设计`/`03-功能实现`/`04-问题修复`/`05-测试文档` |
| `status` | 是 | 当前状态 | `未确认`/`已确认`/`已归档` |
| `priority` | 是 | 优先级 | `高`/`中`/`低` |
| `created` | 是 | 创建日期 | `YYYY-MM-DD` 格式 |
| `execution_mode` | 是 | 执行模式 | `single-agent`/`agent-teams` |
| `tags` | 是 | 标签列表 | 至少包含 `spec` 和 `plan` |
| `related` | 否 | 关联的其他 Spec | 双链列表 |

### status 状态变更规则

```
未确认 ──用户确认执行──→ 已确认 ──归档完成──→ 已归档
  ↑                        │
  └──用户修改文档内容───────┘
```

| 触发条件 | 状态变更 |
|----------|----------|
| 创建 plan.md | → `未确认` |
| 用户确认执行 | `未确认` → `已确认` |
| 用户修改文档 | `已确认` → `未确认` |
| 归档完成 | `已确认` → `已归档` |

---

## plan.md 正文结构

plan.md 必须包含以下章节：

1. 概述（背景、目标、范围）
2. 需求分析
3. 设计方案
4. **执行模式**（单 Agent / Agent Teams）
5. 实现步骤
6. 测试计划
7. 风险和依赖
8. **文档关联**（固定章节）

---

## 执行模式章节格式

### 单 Agent 模式（仅需填写选择部分）

```markdown
## X. 执行模式

### 执行模式选择

**推荐模式**：单 Agent

**选择理由**：
- [具体理由]
```

### Agent Teams 模式（需填写完整）

```markdown
## X. 执行模式

### 执行模式选择

**推荐模式**：Agent Teams

**选择理由**：
- [具体理由]

### Agent Teams 任务拆分

| 队友名称 | 职责 | 输入 | 输出 | 依赖 |
|----------|------|------|------|------|
| implementer | 核心功能实现 | plan.md 第 3 章 | src/services/*.py | 无 |
| tester | 测试编写与验证 | plan.md 第 5 章 + implementer 产出 | tests/*.py | implementer |
| doc-writer | summary.md 撰写 | 全部产出 | summary.md | implementer, tester |

### 队友间协作规则

- implementer 完成后通知 tester 开始
- tester 发现问题直接通知 implementer 修复
- 所有队友完成后由 team-lead 汇总生成 summary.md
```

---

## 文档关联章节格式

```markdown
## 文档关联

- 实现总结: [[summary|实现总结]] (待创建)
- 审查报告: [[review|审查报告]] (待创建)
```

> plan.md 创建时这些链接目标尚不存在，执行实现后会自动生效。

关联其他 Spec 示例：`参见 [[../20260103-1430-数据模型设计/plan|数据模型设计]]`

---

## Obsidian 格式优化

1. **文档关联**：使用 `[[]]` 双链建立文档间关系
2. **Callout**：`> [!warning]` 风险、`> [!tip]` 建议、`> [!important]` 关键决策、`> [!note]` 补充
3. **标签**：在 frontmatter 或正文中添加标签（如 `#spec/功能实现`）
