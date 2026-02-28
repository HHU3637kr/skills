# plan.md 模板与字段参考（v2.0）

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
| `execution_mode` | 是 | 执行模式，v2.0 固定 `single-agent` | `single-agent` |
| `tags` | 是 | 标签列表 | 至少包含 `spec` 和 `plan` |
| `related` | 否 | 关联的其他 Spec | 双链列表 |

> [!important] v2.0 变更：execution_mode 固定为 single-agent
> Teams 架构取代了原来的 agent-teams 路径 B，plan.md 中不再使用 agent-teams 模式。

---

## plan.md 正文结构（v2.0）

plan.md 必须包含以下章节：

1. 概述（背景、目标、范围）
2. 需求分析
3. 设计方案
4. **执行模式**（固定 single-agent，说明理由）
5. 实现步骤
6. 风险和依赖
7. **文档关联**（固定章节）

> [!important] v2.0 变更：移除测试计划章节
> plan.md 不再包含测试计划章节。测试计划由 spec-tester 用 spec-test 单独创建 test-plan.md。

---

## 执行模式章节格式

```markdown
## X. 执行模式

### 执行模式选择

**推荐模式**：单 Agent

**选择理由**：
- [具体理由]
```

---

## 文档关联章节格式

```markdown
## 文档关联

- 实现总结: [[summary|实现总结]] (待创建)
- 测试计划: [[test-plan|测试计划]] (待创建，由 spec-tester 创建)
```

关联其他 Spec 示例：`参见 [[../20260103-1430-数据模型设计/plan|数据模型设计]]`

---

## Obsidian 格式优化

1. **文档关联**：使用 `[[]]` 双链建立文档间关系
2. **Callout**：`> [!warning]` 风险、`> [!tip]` 建议、`> [!important]` 关键决策、`> [!note]` 补充
3. **标签**：在 frontmatter 或正文中添加标签（如 `#spec/功能实现`）
