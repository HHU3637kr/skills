# 审查报告模板与字段参考

## Frontmatter

### review.md（新功能审查）

```yaml
---
title: 功能名称-审查报告
type: review
category: 03-功能实现
status: 未确认
result: 通过/需修复/严重不符
created: YYYY-MM-DD
plan: "[[plan]]"
summary: "[[summary]]"
tags:
  - spec
  - review
---
```

### update-xxx-review.md（更新审查）

```yaml
---
title: 功能名称-更新XXX-审查报告
type: review
update_number: 1
category: 03-功能实现
status: 未确认
result: 通过/需修复/严重不符
created: YYYY-MM-DD
plan: "[[plan]]"
update: "[[update-XXX]]"
update_summary: "[[update-XXX-summary]]"
tags:
  - spec
  - review
---
```

### 字段说明

| 字段 | review.md | update-xxx-review.md | 说明 |
|------|-----------|----------------------|------|
| `title` | 必填 | 必填 | `功能名称-审查报告` / `功能名称-更新XXX-审查报告` |
| `type` | `review` | `review` | 固定值 |
| `update_number` | - | 必填 | 更新编号，与 update 文档一致 |
| `category` | 必填 | 必填 | 继承自原 plan.md |
| `status` | 必填 | 必填 | `未确认`/`已确认`/`已归档` |
| `result` | 必填 | 必填 | `通过`/`需修复`/`严重不符` |
| `created` | 必填 | 必填 | `YYYY-MM-DD` 格式 |
| `plan` | 必填 | 必填 | 链接到 plan.md |
| `summary` | 必填 | - | 链接到 summary.md |
| `update` | - | 必填 | 链接到 update-xxx.md |
| `update_summary` | - | 必填 | 链接到 update-xxx-summary.md |

### result 可选值

| 值 | 使用场景 |
|----|----------|
| `通过` | 所有功能已完成，无不符项，可以归档 |
| `需修复` | 存在未完成或不符项，需要修复后再归档 |
| `严重不符` | 实现与 Spec 严重不符，需要重新实现 |

### status 状态变更规则

| 触发条件 | 状态变更 |
|----------|----------|
| 创建 review.md | → `未确认` |
| 用户确认审查报告 | `未确认` → `已确认` |
| 用户修改文档 | `已确认` → `未确认` |
| 归档完成 | `已确认` → `已归档` |

---

## 审查报告正文模板

```markdown
# Spec 审查报告

## 文档信息

- **审查日期**: YYYY-MM-DD HH:MM
- **审查对象**: plan.md / update-xxx.md
- **Spec 路径**: spec/分类目录/YYYYMMDD-HHMM-任务描述/

---

## 1. 审查摘要

| 类别 | 数量 | 状态 |
|------|------|------|
| 已完成 | X | ✅ |
| 未完成 | X | ❌ |
| 不符项 | X | ⚠️ |
| 额外项 | X | ➕ |

**总体评价**：通过 / 需修复 / 严重不符

---

## 2. 详细检查结果

### 2.1 功能完成度

#### ✅ 已完成

| 功能 | Spec 位置 | 实现位置 | 说明 |
|------|-----------|----------|------|
| 功能 1 | plan.md 3.1 | xxx.py:50 | 符合预期 |

#### ❌ 未完成

| 功能 | Spec 位置 | 说明 |
|------|-----------|------|
| 功能 X | plan.md 3.5 | 未找到实现 |

#### ⚠️ 不符项

| 功能 | Spec 定义 | 实际实现 | 差异说明 |
|------|-----------|----------|----------|
| 接口 Y | `def foo(a, b)` | `def foo(a)` | 缺少参数 b |

#### ➕ 额外项

| 功能 | 实现位置 | 说明 |
|------|----------|------|
| （无） | - | - |

---

### 2.2 数据模型检查

[Spec 定义 vs 实际实现对比，列出差异]

### 2.3 API 接口检查

| 接口 | Spec 定义 | 实现状态 | 说明 |
|------|-----------|----------|------|
| GET /api/xxx | 返回列表 | ✅ | 符合 |

### 2.4 测试检查

| 测试项 | 计划 | 实际 | 状态 |
|--------|------|------|------|
| 单元测试 | 10 | 10 | ✅ |

---

## 3. 问题清单

### 高优先级 🔴

1. **问题描述**
   - Spec 位置：plan.md X.X
   - 问题：[描述]
   - 建议：[修复建议]

### 中优先级 🟡

### 低优先级 🟢

---

## 4. 审查结论

### 是否可以归档

- [ ] 可以归档（所有功能已完成，无不符项）
- [ ] 需要修复后再归档
- [ ] 严重不符，需要重新实现

### 修复建议

1. [具体修复项]

---

## 5. 文档关联

- 设计文档: [[plan|设计方案]]
- 实现总结: [[summary|实现总结]]
```

---

## Obsidian 格式要求

1. **文档关联（必须）**：使用 `[[]]` 双链
   - review.md → 链接 plan.md 和 summary.md
   - update-xxx-review.md → 链接 update-xxx.md 和 update-xxx-summary.md

2. **Callout 标注审查结果**：
   - `> [!success]` 审查通过部分
   - `> [!failure]` 未完成或不符项
   - `> [!warning]` 需要关注的风险点
   - `> [!tip]` 改进建议

3. **标签**：`#spec/审查` `#review`，如有问题加 `#spec/待修复`
