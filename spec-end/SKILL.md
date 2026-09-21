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
| 权限 | 写 `ender/end-report.html`、调用 exp-reflect 分流、归档目录、git commit/push/创建 PR（`autopilot` 下可自主执行这些可逆动作）；维护 AGENTS.md/rules 属永远门禁，任何模式下都必须先经用户确认；合并、改动远程默认分支不在本 Skill 权限内；force push **仅豁免**收尾时对自己刚推送的 Spec 分支做 amend（`git commit --amend` + `git push --force-with-lease`，让 PR URL 等收尾写回并入同一次提交），其余 force push 不在权限内 |
| 验证 | 各阶段已完成、经验已分流沉淀、规范审查有结论；归档前必须在当前工作树上跑一次全量测试并观察输出（新鲜验证，引用历史测试结论、「刚才是绿的」都不算）；合并完成后必须在**合并结果**上再跑一次全量测试——合并可能引入语义冲突，两个分支各自绿不代表合并后绿；归档前当前分支等于 `git_branch`，且不等于远程默认分支（用 `git symbolic-ref refs/remotes/origin/HEAD` 读出，不假定分支名） |
| 停止 | 收尾确认方式随模式（见核心原则 4）；两项永远门禁——合并分支、直接改动远程默认分支——任何模式下都必须停下等用户，`autopilot` 遇到时就地降级为门禁模式；丢弃改动、删除分支必须拿到用户键入的精确确认词才执行；force push 仅收尾 amend 场景豁免（对刚推送的 Spec 分支 `--amend` + `--force-with-lease`），其余 force push 仍是门禁并需精确确认词；用户选"暂不归档"则只产出报告即停止 |
| 升级 | 阶段未真正完成、全量测试未绿、规范变更影响面大、或 Git 状态异常（分支不符、在远程默认分支上提交）时，停止并交回用户决策 |

## 核心原则

1. **多角色视角**：通过 TeamLead 收集各角色视角的经验素材，不只是 spec-ender 的独角戏
2. **分流沉淀**：调用 exp-reflect 按权重分流（重大经验 → exp-write，轻量 → Auto Memory）
3. **规范维护审查**：判断本次 Spec 是否产生需要长期遵守的项目规范，必要时更新 AGENTS.md 或 .agents/rules/
4. **确认方式随模式**：`gated` 模式下归档、提交、推送、创建 PR 前都必须用当前运行环境的确认方式询问用户；`autopilot` 模式下可自主 push 工作分支并创建 PR（两者可逆，且 PR 本身就是给人审的入口），但合并分支、直接改动远程默认分支这两项是永远门禁，任何模式下都必须停下等人；force push 仅收尾 amend 场景豁免（对刚推送的 Spec 分支做 `git commit --amend` + `git push --force-with-lease`，这是让收尾只提交一次的既定动作），其余 force push 仍是门禁
5. **GitHub Flow 收尾**：先跑全量测试，绿了之后才出收尾菜单——测试还红着的时候不要问用户「要不要归档」；放行后调用 git-work 提交、推送当前 Spec 分支并创建 PR
6. **报告用 HTML，记忆用 Markdown**：`ender/end-report.html` 遵循 html-report 契约（`rk:*` meta + `.rk-meta` 双轨元信息、`rk-links` / `rk-backlinks` 双向关联、`data-rev` 修订标记）；`spec/context/experience/*.md`、`knowledge/*.md` 保持 Markdown 不变；账本 `.md` / `.html` 皆可

## 工作流程

### 步骤 1：接收任务与接力 AWR 会话

1. 执行 AWR 会话接力与上下文准备：
   ```bash
   # 接力上游 spec-reviewer 的会话并转移任务租约（Claim Transfer）
   awr session resume --from-session <REVIEWER-SESSION-ID> --agent spec-ender --expected-revision <REV>
   # 绑定会话提取全景上下文
   awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary
   ```
2. 从 TeamLead 的启动指令中获取：
   - 当前 Spec 的目录路径
   - 确认所有阶段（计划/实现/测试/审查）已完成
   - 当前工作分支（应与 `lead/team-context.md` 的 `git_branch` 一致）
   - base 分支（用 `git symbolic-ref refs/remotes/origin/HEAD` 读远程默认分支）
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

### 步骤 6：创建 ender/end-report.html 并按模式确认归档创建 PR

在当前 Spec 目录下创建 `ender/end-report.html`，按 html-report skill 的固定骨架承载：

- `<head>` 写全 `rk:*` meta（`rk:type=end-report`、`rk:spec-dir`、`rk:role=spec-ender`、`rk:created`、`rk:updated`、`rk:revision`、`rk:mode`、`rk:git-branch`、`rk:base-branch`、`rk:pr-url`、`rk:tags`），并用 `<link rel="rk-plan|rk-summary|rk-test-report|rk-review|rk-ledger" href="...">` 声明关联；`.rk-meta` 人可读镜像同样字段（含运行模式、基准分支与 PR）
- `rk-verdict`（`is-pass` / `is-fail`）一句话给出本次 Spec 的完成结论
- 「修订历史」表固定 5 列（修订/日期/修改人/改了什么/原因），不新增列；后续补 PR URL 等修改时修订号 +1、追加修订历史行、正文用 `data-rev` 标记，不静默改写；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-003（…）`），纯笔误/措辞/补充直接写清，不编造编号
- 正文章节：完成状态、本轮全量测试的命令与退出码（新鲜验证证据）、已扫描的角色产物路径、经验沉淀结果或无需沉淀的说明、规范维护结果或无需维护的说明、归档/提交/推送/PR 的确认状态（写明按哪种模式放行）、待用户处理的永远门禁项（合并/默认分支改动；force push 仅收尾 amend 场景豁免）
- 关键决策用 `rk-cal key` 小结（取自账本「决策记录」，只写结论与一句话理由并标注 `D-xxx`，决策过程正文不复制进报告），遗留风险用 `rk-cal risk`，需后续观察项用 `rk-cal warn`
- 末尾「关联产物」拆两个 `h3`：「本报告引用」用 `<ul class="rk-links">` + `data-rk-link` 列出全部角色产物（`.html`）与 `<a href="../lead/team-context.md">运行账本</a>`、沉淀的经验/知识 `.md`；「引用本报告」用 `<ul class="rk-backlinks">` + `data-rk-backlink` 列出引用方；本报告新建的每条关联都要到对侧报告的 `rk-backlinks` 补反链，对侧未产出时先标注（待创建）

然后跑一次全量测试并观察输出。**测试全绿之后才出收尾菜单**——红着的时候先把它变绿或交回用户决策，不要问用户「要不要归档」。

`gated` 模式下向用户确认：

```text
确认目标：所有阶段已完成，全量测试本轮已在当前工作树上跑过且全绿，经验沉淀与规范审查也已完成。是否确认本 Spec 原位归档，并提交、推送当前分支、创建向目标分支（dev）的 PR/MR？

选项：
- 确认原位归档并创建 PR/MR
- 暂不归档
```

`autopilot` 模式下，由「本轮全量测试的新鲜验证输出 + `ender/end-report.html` 的 `rk-verdict` 完成结论」替代该确认，两者缺一不可放行；自门禁通过的范围只到原位归档状态更新、commit、push 工作分支、创建 PR/MR、以及收尾 amend（`--amend` + `--force-with-lease` 并入 PR/MR URL），触及合并、改动远程默认分支、或非 amend 的 force push 时立即降级为门禁模式等待用户。

### 步骤 7：原位归档（`gated` 用户确认后，`autopilot` 自门禁通过后）

用户选择"确认原位归档并创建 PR/MR"（`autopilot` 下为自门禁通过）：

1. **原位归档更新与释放租约**：保留当前 Spec 在所属 Version 的原物理目录（`spec/versions/<version>/specs/<spec-dir>/`），禁止移出目录。在 `lead/team-context.md` 中将 `status` 更新为 `archived`，在 `spec/work-ledger.yaml` 中将该工作项标记为 `completed`，并在所属版本的 `spec/versions/<version>/version-context.md` Spec 清单中将本 Spec 标记为 `done`。
   同步向 AWR 提交最终会话检查点并显式释放租约（Session End）：
   ```bash
   # 1. 提交完工检查点
   awr session checkpoint --session <SESSION-ID> --context-hash <HASH> --digest "spec-ender: Spec 原位归档完成，测试全绿，已创建 PR/MR，产出 end-report.html" --next-action "Spec 已完结，等待合流与版本集成" --expected-revision <REV>
   # 2. 显式关闭会话并释放工作项独占租约，彻底杜绝 orphan_session 孤儿会话
   awr session end --session <SESSION-ID> --outcome ended --expected-revision <REV>
   ```
2. 调用 `/git-work` 的“完成 Spec 分支”模式：
   - 确认当前分支不等于远程默认分支（`git symbolic-ref refs/remotes/origin/HEAD` 读出，不要假定分支名）
   - 确认当前分支等于 `lead/team-context.md` 的 `git_branch`
   - 审查 diff
   - commit
   - push
   - 创建面向 `dev` 的 PR/MR（平台中立）或输出 compare URL
3. 如果获得 PR/MR URL，写回归档后 `lead/team-context.md` 的 `pr_url` 字段，以及 `ender/end-report.html` 的 `<meta name="rk:pr-url">` 与 `.rk-meta` PR 两处（按修订规范修订号 +1、追加修订历史行），然后**并入同一次提交**，不产生第二次提交：

   ```bash
   git add <spec-docs>
   git commit --amend --no-edit
   git push --force-with-lease origin <branch-name>
   ```

   `--force-with-lease` 只覆盖自己刚推送的 Spec 分支，若远程分支被他人改动会拒绝，不会误覆盖。
4. 合并由用户执行或明确放行；一旦发生合并，必须在合并结果上重跑全量测试并观察输出，绿了才算收尾完成
5. 全过程中若出现需要丢弃改动（`git checkout --` / `reset --hard` / `stash drop`）、删除分支的情形，必须停下并要求用户键入精确确认词（如 `discard` / `delete-branch`）；第 3 步的 amend + force-with-lease 是用户确认过的收尾既定动作，无需逐次确认；其它任何 force push（不是 amend 自己刚推的 Spec 分支）仍是门禁，必须停下并要求精确确认词 `force-push`；「差不多同意」「你看着办」「随你」不构成授权，`autopilot` 模式同样不豁免

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
spec-ender → 全量测试绿 → 按模式确认归档（`gated` 问用户 / `autopilot` 凭新鲜验证自门禁）
[如归档] spec-ender → 移动目录 → git-work 提交 + 推送 + 创建 PR
spec-ender → 通知 TeamLead 完成
TeamLead → 通知用户整个流程完成，本次 Spec 团队实例结束
```

## 后续动作

完成收尾后确认：
1. 已通过 TeamLead 收集所有相关角色素材，或在角色线程不可恢复时基于 Spec 文档补足
2. 已调用 exp-reflect 完成分流沉淀
3. 已完成项目规范维护审查；如需更新，已获得用户确认并完成修改
4. 已在当前工作树上跑过全量测试并观察输出，绿了之后才出的收尾菜单
5. 已按模式完成归档确认（`gated` 用户确认 / `autopilot` 新鲜验证 + `rk-verdict`）
6. 如归档：已移动目录 + 已调用 git-work 提交、推送、创建 PR；合并、改动远程默认分支均留给用户；force push 仅以收尾 amend 形式用于并入 PR URL
7. 如有 PR URL：已写回 `lead/team-context.md` 和 `ender/end-report.html`（含 `rk:pr-url` meta 与 `.rk-meta` 镜像，且留下修订痕迹），并通过 amend + force-with-lease 并入同一次提交（收尾历史只有一次提交）
8. 如已发生合并：已在合并结果上重跑全量测试并观察输出
9. 已更新 `lead/team-context.md` 的「任务进度」中自己的收尾任务行
10. 已通知 TeamLead

### 常见陷阱
- 跳过多角色讨论，只用自己的视角沉淀经验（会遗漏各角色的独特发现）
- 把详细规范或一次性实现细节写进 AGENTS.md，导致入口文件膨胀
- 把一次性实现细节写进 rules，导致长期规范失真
- 本次形成了长期安全/日志/测试约束，却忘记更新 .agents/rules/
- 在远程默认分支上直接提交 Spec 成果，或把默认分支名写死成固定值（应读 `git symbolic-ref refs/remotes/origin/HEAD`）
- 全量测试还红着就出收尾菜单问用户要不要归档
- 合并后不在合并结果上重跑全量测试，拿合并前两边各自的绿当结论
- 把「你看着办」当成丢弃改动、删分支或 force push（非收尾 amend 场景）的授权（必须拿到精确确认词）
- `autopilot` 模式下自行合并分支或改动远程默认分支（永远门禁，必须降级等人）
- 创建 PR 前没有确认当前分支与 `lead/team-context.md` 的 `git_branch` 一致
- `gated` 模式下未询问用户就直接归档；或 `autopilot` 模式下拿不出本轮全量测试输出就自门禁放行
- 沉淀完成后忘记通知 TeamLead
- 归档后没检查报告里 `html-report/assets/` 的相对层级，`file://` 打开丢样式
- 补 PR URL 时直接改写 `end-report.html` 却不递增修订号、不追加修订历史行
- 只更新 `.rk-meta` 却漏了 `<head>` 的 `rk:*` meta（或反之），元信息双轨不完整
- 把经验/知识记忆改成 HTML（必须保持 Markdown 供 `exp-search` 检索；账本不受此限）