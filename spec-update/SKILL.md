---
disable-model-invocation: true
name: spec-update
description: 当同一个活跃 Spec 在当前工作分支内需要小迭代、补充需求、修正方案或优化实现，且原 Spec 目录已有 writer/plan.html + executor/summary.html 时使用。默认复用 writer/plan.html 记录的 git_branch，不新建分支。不要用于新功能从零设计、已合并/已关闭分支上的后续需求，或需要独立 PR 的较大变更。
---

# Spec Update

## 核心原则

1. **同 Spec 原则**：update 报告必须放在原 Spec 目录的 `updater/` 下，禁止创建新的 Spec 根目录
2. **不归档原则**：更新完成后不归档，保留在原目录以便后续更新
3. **编号递增**：`updater/update-001.html` → `updater/update-002.html` → `updater/update-003.html`（三位数，不跳号）
4. **严格遵循方案**：只实现 `updater/update-xxx.html` 定义的修改，不添加方案之外的内容
5. **回归测试必须通过**：新增测试 + 修改测试 + 原有功能回归测试全部通过
6. **规范维护审查**：更新也可能产生长期规则，完成后同样检查是否需要维护 AGENTS.md / .agents/rules/
7. **同分支原则**：update 默认复用原 Spec 的 `git_branch`，禁止为同一活跃 Spec 的小更新默认创建新分支
8. **报告用 HTML**：update 报告遵循 html-report 契约（HTML + 共享样式表 + `data-rev` 修订标记）；`lead/team-context.md` 与经验/知识记忆保持 Markdown

## 用户确认（必须执行）

在以下三个节点**必须**使用当前运行环境的确认方式：

**节点 1 — 更新方案确认**（创建 `updater/update-xxx.html` 后）：
```text
确认目标：updater/update-xxx.html 已创建完成，更新方案是否可以开始执行？
确认选项：
- 确认，开始执行
- 需要修改（请说明修改要求）
```

**节点 2 — 审查报告确认**（生成 `reviewer/update-xxx-review.html` 后）：
```text
确认目标：reviewer/update-xxx-review.html 已创建完成，审查结果是否通过？
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

## 报告模板

- **updater/update-xxx.html 模板**：见 [references/update-template.html](references/update-template.html)（含元信息字段说明）
- **updater/update-xxx-summary.html 模板**：见 [references/summary-template.html](references/summary-template.html)（含元信息字段说明）

两个模板的骨架、组件与修订标记规范由 html-report skill 定义；样式表相对路径按 `updater/` 回到项目根的 4 层写作（`../../../../html-report/assets/rk-report.css`），项目层级不同需相应调整。

**功能等价要求（不允许退化）**：
- 原 frontmatter 字段必须双轨保留：`<head>` 里逐字段写 `<meta name="rk:type|spec-dir|role|update-number|status|update-type|created|updated|revision|git-branch|base-branch|pr-url|tags">`，文档关联写 `<link rel="rk-plan|rk-summary|rk-update|rk-update-summary|rk-review|rk-ledger" href="...">`；`.rk-meta` 镜像同样字段（含基准分支与 PR）
- 原双链必须保留双向：末尾「关联产物」拆成「本报告引用」（`<ul class="rk-links">` + `data-rk-link`）与「引用本报告」（`<ul class="rk-backlinks">` + `data-rk-backlink`）两个 `h3`；谁新建关联谁补对侧反链，对侧报告未产出时在 `rk-links` 标注（待创建）
- 修订历史表固定 5 列（修订/日期/修改人/改了什么/原因），不新增列；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-003（多实例部署需共享缓存）`），纯笔误/措辞/补充直接写清原因，不编造编号；决策过程正文只留在 `lead/team-context.md` 的「决策记录」，不复制进报告

## 工作流程

1. **确认原 Spec 目录**：找到目录，确认 `writer/plan.html` 和 `executor/summary.html` 都存在。若缺少 `executor/summary.html`，先用 spec-execute 完成原功能
2. **确定更新编号**：检查 `updater/` 下已有的 `update-*.html`，确定下一个编号；若 `updater/` 不存在则创建
3. **确认当前 Spec 分支**：读取 `writer/plan.html` 头部 `.rk-meta` 的分支 / 基准分支 / PR 信息，调用 `/git-work` 的“复用 Spec 分支”模式，确认当前分支与 `git_branch` 一致
4. **创建 updater/update-xxx.html**：参照 [references/update-template.html](references/update-template.html)，在 `updater/` 下创建；完整填写 `rk:*` meta 与 `rk-*` link，`.rk-meta` 镜像同样字段，并继承 `writer/plan.html` 的分支 / 基准分支 / PR 元信息
5. **等待用户确认**：使用当前运行环境的确认方式（节点 1）
6. **检索历史经验**：调用 `/exp-search <关键词>`
7. **创建任务清单**：根据 `updater/update-xxx.html` 的"实现步骤"章节创建
8. **按方案实现更新**：严格遵循方案，不修改方案之外的代码
9. **编写/更新测试**：新增测试 + 修改测试 + 回归测试
10. **运行测试验证**：全部通过才能继续
11. **创建 updater/update-xxx-summary.html**：参照 [references/summary-template.html](references/summary-template.html)，应用 html-report 契约：完整 `rk:*` meta + `rk-*` link 双轨元信息、`rk-verdict` 结论块、`rk-cal ok` / `rk-cal warn` 组件、`rk-links` / `rk-backlinks` 双向关联，修订遵循 `data-rev` 规范；并继承 update 报告的 Git 元信息，同时在 `update-xxx.html` 的 `rk-backlinks` 补上本总结的反链
12. **使用 spec-review 审查**：生成 `reviewer/update-xxx-review.html`；审查报告产出后，回到 `update-xxx.html` / `update-xxx-summary.html` 的 `rk-backlinks` 把「审查报告」反链补齐（原先标注「待创建」的条目同步去掉标注）
13. **等待用户确认审查报告**：使用当前运行环境的确认方式（节点 2）
14. **经验与规范收尾**：调用 `/exp-reflect`，并审查是否需要维护 AGENTS.md / .agents/rules/
15. **等待分支收尾确认**：使用当前运行环境的确认方式（节点 3）
16. **提交并推送当前 Spec 分支**：调用 `/git-work` 的“完成 Spec 分支”模式，提交并推送；如果用户确认该 Spec 已准备整体交付，则创建/更新 PR；如获得 PR URL，写回 `writer/plan.html` / `executor/summary.html` / `updater/update-xxx.html` / `updater/update-xxx-summary.html` 的 `.rk-meta` 并补充提交（按修订规范递增修订号、追加修订历史行）
17. **更新 team-context 共享区**：在 `lead/team-context.md` 的「任务进度」中追加或更新 spec-update 自己的更新任务行，「产物」指向 `updater/update-xxx.html` / `updater/update-xxx-summary.html`，「状态」标记为 `done`，填写 「完成时间」 和 `updated_by: spec-update`；若更新解决了问题，同步更新「问题闭环记录」（按性质填「分类」）；本次更新做的方案取舍（含是否仍在原 Spec 范围内的判断）在「决策记录」记一行
18. **完成更新**：不归档，保留在原目录

## 错误处理

| 场景 | 解决方案 |
|------|----------|
| 原 Spec 目录不存在 | 确认路径；若为新功能，用 spec-write + spec-execute |
| 缺少 `executor/summary.html` | 先用 spec-execute 完成原功能 |
| 回归测试失败 | 分析原因 → 修复回归代码 → 重新测试 → 全部通过后才能继续 |
| 当前分支不是 `writer/plan.html` 记录的 `git_branch` | 切回原 Spec 分支；若原分支已合并/删除，应新建 Spec 或询问用户是否创建独立分支 |
| 变更需要独立 PR | 不走默认 update 分支复用路径，询问用户是否新建 Spec 或显式创建独立分支 |

## 后续动作

完成更新后：
1. 调用 `/exp-reflect` 进行经验反思
2. 审查是否需要维护 `AGENTS.md` / `.agents/rules/`；只写长期规则，不写一次性实现细节
3. 如有经验沉淀，更新 `updater/update-xxx-summary.html` 添加经验引用（经验/知识文件本身保持 `.md`）
4. 调用 `/git-work` 提交并推送当前 Spec 分支；只有当 Spec 准备整体交付时才创建/更新 PR
5. 如有 PR URL，写回 `writer/plan.html` / `executor/summary.html` / `updater/update-xxx.html` / `updater/update-xxx-summary.html` 并补充提交
6. 更新 `lead/team-context.md` 的「任务进度」，必要时更新「问题闭环记录」和「决策记录」
7. **不归档**，保留在原目录
