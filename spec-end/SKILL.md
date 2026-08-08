---
disable-model-invocation: true
name: spec-end
description: >
  当一个完整 Spec 的计划、实现、测试阶段都已完成，且角色 spec-ender 进入阶段五收尾时使用：
  收集角色经验、触发 exp-reflect、审查项目规范、询问归档，并完成提交、推送、创建 PR。
  不要用于功能实现中途、测试未完成时，或 spec-update 的小迭代收尾。
---

# Spec End

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还给人。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 当前 Spec 全部角色产物、`lead/team-context.md`（含 Git 元数据）、TeamLead 转回的各角色经验素材 |
| 权限 | 写 `ender/end-report.html`、调用 exp-reflect 分流、用户确认后维护 AGENTS.md/rules、归档目录、git commit/push/PR；规范变更前必须先经用户确认 |
| 验证 | 各阶段已完成、经验已分流沉淀、规范审查有结论、归档前当前分支等于 `git_branch` 且不是 main |
| 停止 | 归档/提交/PR 必须经用户确认才执行；用户选"暂不归档"则只产出报告即停止 |
| 升级 | 阶段未真正完成、规范变更影响面大、或 Git 状态异常（分支不符、main 上提交）时，停止并交回用户决策 |

## 核心原则

1. **多角色视角**：通过 TeamLead 收集各角色视角的经验素材，不只是 spec-ender 的独角戏
2. **分流沉淀**：调用 exp-reflect 按权重分流（重大经验 → exp-write，轻量 → Auto Memory）
3. **规范维护审查**：判断本次 Spec 是否产生需要长期遵守的项目规范，必要时更新 AGENTS.md 或 .agents/rules/
4. **用户确认归档**：归档前必须使用当前运行环境的确认方式询问用户
5. **GitHub Flow 收尾**：归档确认后调用 git-work 提交、推送当前 Spec 分支并创建 PR
6. **报告用 HTML，记忆用 Markdown**：`ender/end-report.html` 遵循 html-report 契约（`rk:*` meta + `.rk-meta` 双轨元信息、`rk-links` / `rk-backlinks` 双向关联、`data-rev` 修订标记）；`lead/team-context.md` 与 `spec/context/experience/*.md`、`knowledge/*.md` 保持 Markdown 不变

## 工作流程

### 步骤 1：接收任务

从 TeamLead 的启动指令中获取：
- 当前 Spec 的目录路径
- 确认所有阶段（计划/实现/测试）已完成
- 当前工作分支（应与 `lead/team-context.md` 的 `git_branch` 一致）
- base 分支（通常为 `main`）

### 步骤 2：扫描 Spec 目录

读取当前 spec 目录下的所有角色产物：
- `lead/team-context.md`：团队运行上下文（Markdown 运行账本）
- `explorer/exploration-report.html`：探索阶段发现
- `writer/plan.html`：设计方案
- `tester/test-plan.html`：测试策略
- `executor/summary.html`：实现细节
- `tester/test-report.html`：测试过程和结果
- `reviewer/review.html` / `reviewer/update-xxx-review.html`：审查报告（如有）
- `updater/update-xxx.html` / `updater/update-xxx-summary.html`：更新方案和总结（如有）
- `debugger/debug-xxx.html` / `debugger/debug-xxx-fix.html`：问题和修复（如有）

同时读取 `lead/team-context.md` 的运行账本：
- frontmatter 的 `git_branch` / `base_branch` / `pr_url`
- 「决策记录」：本次所有实质取舍及理由——end-report 的「关键决策」小结直接来自此表，无需重新回忆；用 `rk-cal key` 承载
- 「问题闭环记录」：本次遇到并解决的 bug 与过程性问题，供 exp-reflect 分流沉淀

如果 `git_branch` 为空或为 `none`，说明本 Spec 没有使用 GitHub Flow 分支；收尾时仍可归档文档，但提交/PR 步骤需要先询问用户。

### 步骤 3：通过 TeamLead 收集团队成员素材

向 TeamLead 请求恢复或转询相关角色，收集本次开发的经验素材：

```text
询问 spec-writer：本次撰写 writer/plan.html 时遇到的困难、踩过的坑、值得记录的发现？
询问 spec-tester：本次测试过程中的发现、边界情况、改进建议？
询问 spec-executor：本次实现过程中遇到的技术挑战、解决方案、值得复用的模式？
询问 spec-debugger：本次调试的根因分析、修复思路、预防建议？（如有 debug 文档）
询问 spec-reviewer：本次审查中发现的完成度风险、测试缺口或规范建议？（如有 review 文档）
```

等待 TeamLead 转回各角色回复，汇总讨论结果。若运行环境无法恢复角色线程，则基于当前 Spec 目录文档补足对应视角。

### 步骤 4：调用 exp-reflect 分流沉淀

以当前 Spec 目录文档为素材（exp-reflect 会直接读取文档，无需手动整理素材），调用 `/exp-reflect` 并传递目录路径：

```bash
/exp-reflect spec/当前任务目录路径
```

exp-reflect 会根据经验的重要性分流：
- 重大经验（解决了重要问题、有高复用价值）→ `exp-write` 写入正式经验文件
- 轻量知识（小技巧、上下文记忆）→ Auto Memory
- 项目规范、项目偏好或规则变化 → 建议更新 `AGENTS.md` / `.agents/rules/`（这些文件保持 Markdown）

### 步骤 5：项目规范维护审查

归档前轻量审查本次 Spec 是否产生长期规则或长期项目偏好。`AGENTS.md` 保持入口清单定位；只在命中明确、长期有效的变化时更新，不为了“有动作”而改规范。

| 发现内容 | 维护位置 |
|----------|----------|
| 项目名称/一句话身份、核心技术栈摘要、AGENTS 路由或 import 变化 | `AGENTS.md` |
| 启动/部署方式、开发流程细则、长期编码约定、安全规则、日志/审计要求、测试约束、目录/命名规范、产品/前端偏好 | `.agents/rules/*.md` |
| 可复用操作流程（部署、发布、迁移等） | `.agents/skills/sop-xxx/SKILL.md` |
| 项目架构、数据流、模块理解 | `spec/context/knowledge/`（保持 `.md`，被 exp-search 检索） |
| 困境-策略、踩坑经验 | `spec/context/experience/`（保持 `.md`，被 exp-search 检索） |

审查问题：
- 本次是否形成了以后都要遵守的编码/安全/测试/日志/审计规则？
- 本次是否改变了项目身份摘要、AGENTS 入口路由、目录结构、模块边界、启动或部署方式？
- 本次是否形成了长期产品体验、前端样式或协作偏好，需要写入 `.agents/rules/project-preferences.md` 或相关 rules？
- 本次是否暴露了反复出现的问题，需要写入 rules 防止复发？
- 本次是否形成了可机械复用的 SOP，应创建或更新 Skill？

如需更新，先向用户说明将修改哪些规范文件，得到确认后再编辑。

### 步骤 6：创建 ender/end-report.html 并询问用户是否归档创建 PR

在当前 Spec 目录下创建 `ender/end-report.html`，按 html-report skill 的固定骨架承载：

- `<head>` 写全 `rk:*` meta（`rk:type=end-report`、`rk:spec-dir`、`rk:role=spec-ender`、`rk:created`、`rk:updated`、`rk:revision`、`rk:git-branch`、`rk:base-branch`、`rk:pr-url`、`rk:tags`），并用 `<link rel="rk-plan|rk-summary|rk-test-report|rk-review|rk-ledger" href="...">` 声明关联；`.rk-meta` 人可读镜像同样字段（含基准分支与 PR）
- `rk-verdict`（`is-pass` / `is-fail`）一句话给出本次 Spec 的完成结论
- 「修订历史」表固定 5 列（修订/日期/修改人/改了什么/原因），不新增列；后续补 PR URL 等修改时修订号 +1、追加修订历史行、正文用 `data-rev` 标记，不静默改写；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-003（…）`），纯笔误/措辞/补充直接写清，不编造编号
- 正文章节：完成状态、已扫描的角色产物路径、经验沉淀结果或无需沉淀的说明、规范维护结果或无需维护的说明、归档/提交/推送/PR 的待确认状态
- 关键决策用 `rk-cal key` 小结（取自账本「决策记录」，只写结论与一句话理由并标注 `D-xxx`，决策过程正文不复制进报告），遗留风险用 `rk-cal risk`，需后续观察项用 `rk-cal warn`
- 末尾「关联产物」拆两个 `h3`：「本报告引用」用 `<ul class="rk-links">` + `data-rk-link` 列出全部角色产物（`.html`）与 `<a href="../../lead/team-context.md">运行账本</a>`、沉淀的经验/知识 `.md`；「引用本报告」用 `<ul class="rk-backlinks">` + `data-rk-backlink` 列出引用方；本报告新建的每条关联都要到对侧报告的 `rk-backlinks` 补反链，对侧未产出时先标注（待创建）

然后向用户确认：

```text
确认目标：所有阶段已完成，经验沉淀与规范审查也已完成。是否可以将本 Spec 归档到 06-已归档，并提交、推送当前分支、创建 PR？
确认选项：
- 确认归档并创建 PR
- 暂不归档
```

### 步骤 7：归档（用户确认后）

用户选择"确认归档并创建 PR"：

1. 将 Spec 目录移动到 `spec/06-已归档/`（报告仍为 `.html`，`lead/team-context.md` 与记忆文件仍为 `.md`；目录层级不变，报告内 `../../../../html-report/assets/` 相对路径继续生效——若归档改变了层级深度，同步修正样式表与脚本路径）
2. 调用 `/git-work` 的“完成 Spec 分支”模式：
   - 确认当前分支不是 `main`
   - 确认当前分支等于 `lead/team-context.md` 的 `git_branch`
   - 审查 diff
   - commit
   - push
   - 创建 PR 或输出 compare URL
3. 如果获得 PR URL，写回归档后 `lead/team-context.md` 的 `pr_url` 字段，以及 `ender/end-report.html` 的 `<meta name="rk:pr-url">` 与 `.rk-meta` PR 两处（按修订规范修订号 +1、追加修订历史行），并补充提交推送

用户选择"暂不归档"：
- 跳过归档步骤，直接执行步骤 8

### 步骤 8：通知 TeamLead 完成

先更新当前 Spec 的 `lead/team-context.md` 共享区：
- 在「任务进度」中追加或更新 spec-ender 自己的收尾任务行
- 「产物」指向 `ender/end-report.html`
- 「状态」标记为 `done`
- 「完成时间」 使用当前时间，「更新者」 写 `spec-ender`
- 只修改「任务进度」，不要修改 TeamLead 控制面区块；PR URL 等控制面字段由 TeamLead 更新

```text
通知 TeamLead：收尾工作完成，本次 Spec 团队实例结束；项目级角色定义保留。
```

## 与其他角色的协作

```
[所有其他阶段完成]
TeamLead → spec-ender 开始
spec-ender → 向 TeamLead 请求各角色经验素材
TeamLead → 恢复/转询各角色 → 回复经验素材
spec-ender → 汇总 + 调用 exp-reflect → 沉淀经验
spec-ender → 规范维护审查 → 必要时更新 AGENTS.md / .agents/rules/
spec-ender → ender/end-report.html
spec-ender → 用户确认归档
[如归档] spec-ender → 移动目录 → git-work 提交 + 推送 + 创建 PR
spec-ender → 通知 TeamLead 完成
TeamLead → 通知用户整个流程完成，本次 Spec 团队实例结束
```

## 后续动作

完成收尾后确认：
1. 已通过 TeamLead 收集所有相关角色素材，或在角色线程不可恢复时基于 Spec 文档补足
2. 已调用 exp-reflect 完成分流沉淀
3. 已完成项目规范维护审查；如需更新，已获得用户确认并完成修改
4. 已询问用户是否归档
5. 如归档：已移动目录 + 已调用 git-work 提交、推送、创建 PR
6. 如有 PR URL：已写回 `lead/team-context.md` 和 `ender/end-report.html`（含 `rk:pr-url` meta 与 `.rk-meta` 镜像，且留下修订痕迹）
7. 已更新 `lead/team-context.md` 的「任务进度」中自己的收尾任务行
8. 已通知 TeamLead

### 常见陷阱
- 跳过多角色讨论，只用自己的视角沉淀经验（会遗漏各角色的独特发现）
- 把详细规范或一次性实现细节写进 AGENTS.md，导致入口文件膨胀
- 把一次性实现细节写进 rules，导致长期规范失真
- 本次形成了长期安全/日志/测试约束，却忘记更新 .agents/rules/
- 在 `main` 上直接提交 Spec 成果
- 创建 PR 前没有确认当前分支与 `lead/team-context.md` 的 `git_branch` 一致
- 未询问用户直接归档
- 沉淀完成后忘记通知 TeamLead
- 归档后没检查报告里 `html-report/assets/` 的相对层级，`file://` 打开丢样式
- 补 PR URL 时直接改写 `end-report.html` 却不递增修订号、不追加修订历史行
- 只更新 `.rk-meta` 却漏了 `<head>` 的 `rk:*` meta（或反之），元信息双轨不完整
- 把经验/知识记忆或 `lead/team-context.md` 一起改成 HTML（必须保持 Markdown）