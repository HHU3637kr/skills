---
name: spec-update
description: 当同一个活跃 Spec 在当前工作分支内需要小迭代、补充需求、修正方案或优化实现，且原 Spec 目录已有 plan.md + summary.md 时使用。默认复用 plan.md 记录的 git_branch，不新建分支。不要用于新功能从零设计、已合并/已关闭分支上的后续需求，或需要独立 PR 的较大变更。
---

# Spec Update

## 核心原则

1. **同目录原则**：update 文档必须放在原 plan.md 的同一目录下，禁止创建新目录
2. **不归档原则**：更新完成后不归档，保留在原目录以便后续更新
3. **编号递增**：update-001.md → update-002.md → update-003.md（三位数，不跳号）
4. **严格遵循方案**：只实现 update-xxx.md 定义的修改，不添加方案之外的内容
5. **回归测试必须通过**：新增测试 + 修改测试 + 原有功能回归测试全部通过
6. **规范维护审查**：更新也可能产生长期规则，完成后同样检查是否需要维护 AGENTS.md / .agents/rules/
7. **同分支原则**：update 默认复用原 Spec 的 `git_branch`，禁止为同一活跃 Spec 的小更新默认创建新分支

## 用户确认（必须执行）

在以下三个节点**必须**使用当前运行环境的确认方式：

**节点 1 — 更新方案确认**（创建 update-xxx.md 后）：
```text
确认目标：update-xxx.md 已创建完成，更新方案是否可以开始执行？
确认选项：
- 确认，开始执行
- 需要修改（请说明修改要求）
```

**节点 2 — 审查报告确认**（生成 update-xxx-review.md 后）：
```text
确认目标：update-xxx-review.md 已创建完成，审查结果是否通过？
确认选项：
- 审查通过
- 需要修复（请说明问题）
```

**节点 3 — 分支收尾确认**（测试和审查通过后）：
```text
确认目标：本次 update 已通过测试和审查。是否提交并推送当前 Spec 分支？如果该 Spec 已准备整体交付，是否创建/更新 PR？
确认选项：
- 确认，提交并推送
- 暂不提交
```

响应处理：选择确认选项 → 继续；选择修改/修复或"Other" → 根据用户反馈调整后重新确认。

## 文档模板

- **update-xxx.md 模板**：见 [references/update-template.md](references/update-template.md)（含 frontmatter 字段说明）
- **update-xxx-summary.md 模板**：见 [references/summary-template.md](references/summary-template.md)（含 frontmatter 字段说明）

## 工作流程

1. **确认原 Spec 目录**：找到目录，确认 `plan.md` 和 `summary.md` 都存在。若缺少 summary.md，先用 spec-execute 完成原功能
2. **确定更新编号**：检查目录下已有的 `update-*.md`，确定下一个编号
3. **确认当前 Spec 分支**：读取 plan.md 的 `git_branch` / `base_branch` / `pr_url`，调用 `/git-work` 的“复用 Spec 分支”模式，确认当前分支与 `git_branch` 一致
4. **创建 update-xxx.md**：参照 [references/update-template.md](references/update-template.md)，在同一目录创建，并继承 plan.md 的 `git_branch` / `base_branch` / `pr_url`
5. **等待用户确认**：使用当前运行环境的确认方式（节点 1）
6. **检索历史经验**：调用 `/exp-search <关键词>`
7. **创建任务清单**：根据 update-xxx.md 的"实现步骤"章节创建
8. **按方案实现更新**：严格遵循方案，不修改方案之外的代码
9. **编写/更新测试**：新增测试 + 修改测试 + 回归测试
10. **运行测试验证**：全部通过才能继续
11. **创建 update-xxx-summary.md**：参照 [references/summary-template.md](references/summary-template.md)，应用 Obsidian 格式：`[[plan|设计方案]]` 双链、`> [!success]` / `> [!warning]` Callout、`#spec/更新` 标签，并继承 update 文档的 Git 元数据
12. **使用 spec-review 审查**：生成 update-xxx-review.md
13. **等待用户确认审查报告**：使用当前运行环境的确认方式（节点 2）
14. **经验与规范收尾**：调用 `/exp-reflect`，并审查是否需要维护 AGENTS.md / .agents/rules/
15. **等待分支收尾确认**：使用当前运行环境的确认方式（节点 3）
16. **提交并推送当前 Spec 分支**：调用 `/git-work` 的“完成 Spec 分支”模式，提交并推送；如果用户确认该 Spec 已准备整体交付，则创建/更新 PR；如获得 PR URL，写回 plan.md / summary.md / update-xxx.md / update-xxx-summary.md 并补充提交
17. **完成更新**：不归档，保留在原目录

## 错误处理

| 场景 | 解决方案 |
|------|----------|
| 原 Spec 目录不存在 | 确认路径；若为新功能，用 spec-write + spec-execute |
| 缺少 summary.md | 先用 spec-execute 完成原功能 |
| 回归测试失败 | 分析原因 → 修复回归代码 → 重新测试 → 全部通过后才能继续 |
| 当前分支不是 plan.md 的 `git_branch` | 切回原 Spec 分支；若原分支已合并/删除，应新建 Spec 或询问用户是否创建独立分支 |
| 变更需要独立 PR | 不走默认 update 分支复用路径，询问用户是否新建 Spec 或显式创建独立分支 |

## 后续动作

完成更新后：
1. 调用 `/exp-reflect` 进行经验反思
2. 审查是否需要维护 `AGENTS.md` / `.agents/rules/`；只写长期规则，不写一次性实现细节
3. 如有经验沉淀，更新 summary 添加经验引用
4. 调用 `/git-work` 提交并推送当前 Spec 分支；只有当 Spec 准备整体交付时才创建/更新 PR
5. 如有 PR URL，写回 plan.md / summary.md / update-xxx.md / update-xxx-summary.md 并补充提交
6. **不归档**，保留在原目录
