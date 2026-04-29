# writer/plan.md 模板与字段参考（v2.0）

## Frontmatter（必须放在文件最开头）

```yaml
---
title: Spec 标题
type: plan
category: 选择 01-05 工作类型目录
status: 未确认
priority: 高
created: YYYY-MM-DD
execution_mode: single-agent
git_branch: feat/spec-YYYYMMDD-HHMM-ascii-slug
base_branch: main
pr_url:
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
| `category` | 是 | 工作类型目录，必须按 spec-write 的分类决策顺序选择，不能默认写 03 | `01-产品规划`/`02-技术设计`/`03-能力交付`/`04-系统改进`/`05-验证工程` |
| `status` | 是 | 当前状态 | `未确认`/`已确认`/`已归档` |
| `priority` | 是 | 优先级 | `高`/`中`/`低` |
| `created` | 是 | 创建日期 | `YYYY-MM-DD` 格式 |
| `execution_mode` | 是 | 执行模式，v2.0 固定 `single-agent` | `single-agent` |
| `git_branch` | 是 | 当前 Spec 对应的 GitHub Flow 工作分支，由 spec-start 创建 | ASCII 分支名，如 `feat/spec-20260428-1430-user-auth` |
| `base_branch` | 是 | 工作分支的基准分支 | 通常为 `main` |
| `pr_url` | 否 | spec-end 创建 PR 后写回 | GitHub PR URL，创建前留空 |
| `tags` | 是 | 标签列表 | 至少包含 `spec` 和 `plan` |
| `related` | 否 | 关联的其他 Spec | 双链列表 |

> [!important] v2.0 变更：execution_mode 固定为 single-agent
> 该字段只描述实现阶段由 spec-executor 执行代码修改的模式，不表示整个 Spec 工作流没有项目级角色协作。项目级角色由 spec-init 初始化，spec-start 负责加载和唤起。

> [!important] GitHub Flow 元数据
> `git_branch` / `base_branch` 由 spec-start 通过 git-work 创建并传入。不要手写一个不存在的分支；如果项目不是 Git 仓库，写 `git_branch: none` 并在正文说明原因。

---

## writer/plan.md 正文结构（v2.0）

`writer/plan.md` 必须包含以下章节：

1. 概述（背景、目标、范围）
2. 需求分析
3. 设计方案
4. **执行模式**（固定 single-agent，说明理由）
5. 实现步骤
6. 风险和依赖
7. **文档关联**（固定章节）

> [!important] v2.0 变更：移除测试计划章节
> `writer/plan.md` 不再包含测试计划章节。测试计划由 spec-tester 用 spec-test 单独创建 `tester/test-plan.md`。

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

- 实现总结: [[../executor/summary|实现总结]] (待创建)
- 测试计划: [[../tester/test-plan|测试计划]] (待创建，由 spec-tester 创建)
```

关联其他 Spec 示例：`参见 [[../20260103-1430-数据模型设计/plan|数据模型设计]]`

---

## Obsidian 格式优化

1. **文档关联**：使用 `[[]]` 双链建立文档间关系
2. **Callout**：`> [!warning]` 风险、`> [!tip]` 建议、`> [!important]` 关键决策、`> [!note]` 补充
3. **标签**：在 frontmatter 或正文中添加标签（如 `#spec/能力交付`）
