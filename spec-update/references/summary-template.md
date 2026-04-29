---
title: 功能名称-更新XXX-实现总结
type: update-summary
update_number: 1
category: 与 writer/plan.md 相同
status: 已完成
created: YYYY-MM-DD
plan: "[[../writer/plan|plan]]"
update: "[[update-XXX]]"
git_branch: 与 update-XXX.md 相同
base_branch: 与 update-XXX.md 相同
pr_url: 与 update-XXX.md 相同
tags:
  - spec
  - update
  - summary
---

# 更新总结

## 文档信息

- **更新编号**: update-XXX
- **创建日期**: YYYY-MM-DD
- **对应更新文档**: update-XXX.md
- **原 writer/plan.md**: spec/XX-分类/YYYYMMDD-功能名称/writer/plan.md
- **实施人员**: Claude Code
- **实施时间**: X 小时

---

## 1. 更新内容

### 1.1 更新目标

简述本次更新要解决的问题或实现的功能。

### 1.2 完成的修改

- [x] 修改 1：描述
- [x] 修改 2：描述

### 1.3 修改的文件

```
src/
├── services/
│   └── xxx_service.py  # 修改原因
tests/
└── test_xxx.py         # 新增/修改测试
```

---

## 2. 测试结果

### 2.1 新增测试

- **新增测试用例**: X 个
- **通过率**: 100%

### 2.2 回归测试

- **回归测试用例**: X 个
- **通过率**: 100%

### 2.3 测试覆盖率

- **修改前覆盖率**: XX%
- **修改后覆盖率**: XX%

---

## 3. 影响范围

### 3.1 直接影响

- 功能 A：影响描述

### 3.2 兼容性

- **向后兼容**: 是/否
- **API 变更**: 无/描述变更
- **数据迁移**: 无需/描述迁移步骤

---

## 4. 与更新方案的差异

### 4.1 按计划完成

- [x] 计划项 1

### 4.2 调整项（如有）

### 4.3 未完成项（如有）

---

## 5. 回滚方案

1. 步骤 1
2. 步骤 2

**回滚验证**：
- 验证点 1

---

## 6. 后续事项

### 6.1 待观察

### 6.2 后续优化（可选）

### 6.3 规范维护审查

- **是否需要更新 AGENTS.md**: 否/是（说明）
- **是否需要更新 .agents/rules/**: 否/是（说明）
- **规则性质**: 长期规则 / 一次性实现细节（一次性细节不写入规范）

---

## 7. 文档关联

- 更新方案: [[update-XXX|更新方案]]
- 原设计: [[../writer/plan|设计方案]]
- 原总结: [[../executor/summary|实现总结]]
- 审查报告: [[../reviewer/update-XXX-review|审查报告]] (待生成)

---

## Frontmatter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | `功能名称-更新XXX-实现总结` |
| `type` | 是 | `update-summary` |
| `update_number` | 是 | 与 update 文件一致 |
| `category` | 是 | 继承自原 writer/plan.md |
| `status` | 是 | `未确认`/`已确认`/`已归档` |
| `created` | 是 | `YYYY-MM-DD` |
| `plan` | 是 | `"[[../writer/plan|plan]]"` |
| `update` | 是 | `"[[update-XXX]]"` |
| `git_branch` | 是 | 当前 Spec 工作分支，与 update-XXX.md 相同 |
| `base_branch` | 是 | 工作分支的基准分支，与 update-XXX.md 相同 |
| `pr_url` | 否 | 当前 Spec 的 PR 链接，与 update-XXX.md 相同 |
| `tags` | 是 | 至少包含 `spec`、`update`、`summary` |
