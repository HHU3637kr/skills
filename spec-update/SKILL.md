---
disable-model-invocation: false
name: spec-update
description: 当同一个活跃 Spec（位于 `spec/versions/<version>/specs/<spec-dir>/`）在当前工作分支内需要小迭代、补充需求、修正方案或优化实现，且原 Spec 目录已有 writer/plan.html + executor/summary.html 时使用。典型信号：'改 writer/plan.html 里漏掉的分页参数''补一条原 Spec 没覆盖的需求''修 update 方案里写错的验收标准'、修订既有 writer/plan.html / executor/summary.html、给已有报告递增修订号并补修订历史行（5 列格式与 `<ins>/<del>` 标记规则由 html-report 定义，写什么内容、为什么归本 Skill）——只要动的是报告所承载的 Spec 内容，就走本 Skill；请求里出现 report/html 字样不改变归属。只关心报告骨架、样式表、修订标记或 meta/双链格式本身时改用 html-report。默认复用 writer/plan.html 记录的 git_branch，不新建分支。本 Skill 只负责增量方案、实现、测试与审查闭环，**不设独立收尾阶段**——审查通过后统一交回 TeamLead，由 `spec-end` 执行经验沉淀、规范与本体维护、提交/推送、PR 与（可选）原位归档。不要用于新功能从零设计、已合并/已关闭分支上的后续需求，或需要独立 PR/MR 的较大变更。
---
# Spec Update

## 运行契约

> 进入核心原则前先对齐这张表。它把本 Skill 当成一个有边界的小迭代循环单元：明确读什么、能动什么、怎么算完成、什么时候停、什么时候交还统一收尾。

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 原 Spec 产物（`writer/plan.html`、`executor/summary.html`、`lead/team-context.md`）、AWR 聚焦上下文、`exp-search` 检索结果、项目本体 `spec/context/ontology/ontology.json`（如存在） |
| 权限 | 复用当前 Spec 分支（校验，不新开）；写 `updater/update-xxx.html` / `update-xxx-summary.html` + 增量代码与测试 + 协调 `spec-review`；**不做独立收尾**（不执行 `exp-reflect`、不落盘修改 `AGENTS.md`/rules/全局本体、不提交/推送/创建更新 PR、不归档——全部统一交 `spec-end`） |
| 验证 | update 方案经确认；新增测试 + 回归测试全绿；`reviewer/update-xxx-review.html` 审查通过；报告均过 `html-report` 结构机检 |
| 停止 | `reviewer/update-xxx-review.html` 确认通过且账本与待汇总线索记录完毕即停止，交回 TeamLead 进入下一轮 update 或 `spec-end` 统一收尾 |
| 升级 | 原分支已合并/删除、当前变更需独立 PR、或回归/审查发现超出原 Spec 范围时，停止并交回 TeamLead 由用户决策 |

## 核心原则

1. **同 Spec 原则**：update 报告必须放在原 Spec 目录的 `updater/` 下，禁止创建新的 Spec 根目录
2. **不归档原则**：更新阶段不自行归档，保留在原目录以便后续更新或统一交由 `spec-end` 归档
3. **编号递增**：`updater/update-001.html` → `updater/update-002.html` → `updater/update-003.html`（三位数，不跳号）
4. **严格遵循方案**：只实现 `updater/update-xxx.html` 定义的修改，不添加方案之外的内容
5. **回归测试必须通过**：新增测试 + 修改测试 + 原有功能回归测试全部通过
6. **不做独立收尾**：经验沉淀（`exp-reflect`）、规范与本体维护、归档、分支提交/推送与 PR 统一由 `spec-end` 执行；本阶段仅在 `update-xxx-summary.html` 登记待汇总的规范与本体变更线索
7. **同分支原则**：update 默认复用原 Spec 的 `git_branch`，禁止为同一活跃 Spec 的小更新默认创建新分支
8. **报告用 HTML**：update 报告遵循 html-report 契约（HTML + 共享样式表 + `data-rev` 修订标记）；经验/知识记忆保持 Markdown（账本两种格式皆可）
9. **续接同一批角色**：update 是同一个 Spec 的延续，不是新任务。必须续接原来那批角色，不重新 spawn —— 见下文「角色续接」

## 角色续接（必须执行）

用户的期望是「还是那个 writer / tester 在跟我对话」，而不是每次 update 都换一批零历史的新实例。做法固定三步：

1. **查账本**：读 `lead/team-context.md`（或 `.html`）的「角色运行句柄」，取本 Spec 上次用的 `agent_id` 与状态。
2. **核对实况**：用运行时的 agent 列表核对该 handle 当前的真实状态。
3. **按状态决定动作**：

| 账本/实况状态 | 动作 |
|---------------|------|
| `running` / `idle` / `parked` | **发消息**给同一个 agent。`parked` 收到消息会自动复活且上下文完整，不需要任何额外操作 |
| `aborted` | 只能重新 spawn 同一项目级角色，并让它先读账本与既有产物重建上下文 |

**禁止用重新 spawn 代替续接。** 运行时按 name 分配 agent id，同名再 spawn 会得到 `spec-writer-2` 这样的全新零历史实例——影子角色。续接成功后更新账本的「续接方式」与「累计参与 Spec 数」。

跨进程（omp 重启后）handle 可能已失效，此时账本与落盘产物是唯一恢复路径——这也是账本必须实时更新而非攒批的原因。

## 确认方式随模式（必须执行）

`gated` 模式下，以下两个节点必须使用当前运行环境的确认方式向用户确认（分支收尾与提交/推送/PR 统一在 `spec-end` 中确认）。`autopilot` 模式下由各节点标注的机械证据替代，缺证据不得放行：

**节点 1 — 更新方案确认**（创建 `updater/update-xxx.html` 后）：
```text
确认目标：updater/update-xxx.html 已创建完成，更新方案是否可以开始执行？
确认选项：
- 确认，开始执行
- 需要修改（请说明修改要求）
```

**节点 2 — 审查报告确认**（生成 `reviewer/update-xxx-review.html` 后）：
```text
确认目标：reviewer/update-xxx-review.html 已创建完成，审查结果是否通过？审查通过后将交由 TeamLead / spec-end 执行统一收尾（或继续下一轮 spec-update）。
确认选项：
- 审查通过
- 需要修复（请说明问题）
```

响应处理：选择确认选项 → 继续；选择修改/修复或"Other" → 根据用户反馈调整后重新确认。

## 报告模板

- **updater/update-xxx.html 模板**：见 [references/update-template.html](references/update-template.html)（含元信息字段说明）
- **updater/update-xxx-summary.html 模板**：见 [references/summary-template.html](references/summary-template.html)（含元信息字段说明）

两个模板的骨架、组件与修订标记规范由 html-report skill 定义；样式表相对路径按 `updater/` 回到项目根的 6 层写作（`../../../../../../html-report/assets/rk-report.css`），项目层级不同需相应调整。

**功能等价要求（不允许退化）**：
- 原 frontmatter 字段必须双轨保留：`<head>` 里逐字段写 `<meta name="rk:type|spec-dir|role|mode|update-number|status|update-type|created|updated|revision|git-branch|base-branch|pr-url|tags">`，文档关联写 `<link rel="rk-plan|rk-summary|rk-update|rk-update-summary|rk-review|rk-ledger" href="...">`；`.rk-meta` 镜像同样字段（含基准分支与 PR）
- 原双链必须保留双向：末尾「关联产物」拆成「本报告引用」（`<ul class="rk-links">` + `data-rk-link`）与「引用本报告」（`<ul class="rk-backlinks">` + `data-rk-backlink`）两个 `h3`；谁新建关联谁补对侧反链，对侧报告未产出时在 `rk-links` 标注（待创建）
- 修订历史表固定 5 列（修订/日期/修改人/改了什么/原因），不新增列；「原因」列源于实质取舍时引用账本「决策记录」的决策编号（如 `按 D-003（多实例部署需共享缓存）`），纯笔误/措辞/补充直接写清原因，不编造编号；决策过程正文只留在 `lead/team-context.md` 的「决策记录」，不复制进报告
- **首屏与图**（机检强制最低图种）：结论块一句话说清本次更新做什么、为什么必须做、边界在哪里；紧跟变更前后结构图（`rk-fig`，`c-blue` 标改动、`c-muted` 标不变）或变更步骤流程条（`rk-flow`）之一，放在结论块之后、第一个正文章节结束之前。update-summary 则用指标卡（`rk-kpis`：完成项与回归结果，数字须来自实际运行）或流程条（`rk-flow`：完成项进度）之一。
- **图与表分工**：结构变化用 fig、步骤顺序用 flow；update 的接口变更、修改点与文件、风险与回滚用表格，update-summary 的完成项/验收对照、测试命令与退出码、兼容性与差异用表格。仅改文案/配置且无结构变化时，可用 flow 表达变更步骤并注明「结构未变」；未运行的回归不得画成通过。
- **开发者审核关注点**：增量验收标准是否逐条落在 update 报告；影响面、回归范围与兼容性是否覆盖既有功能；数据迁移与回滚是否可执行；是否超出原 Spec 范围；summary 的完成项与 update 方案是否一一对应。
- **篇幅**：按内容选择图，不按字数凑图；单段聚焦一个判断，建议 150 字以内便于扫读。详细差异、接口清单与证据用表格保留，不因篇幅删减。画法见 `html-report/references/figures.md`
- 写完按 html-report「结构机检」一节的命令运行 `check-report.js`，退出码为 0 才算完成

## 工作流程

1. **确认原 Spec 目录、认领 AWR 增量会话并准备上下文**：找到目录，确认 `writer/plan.html` 和 `executor/summary.html` 都存在。
   执行 AWR 会话认领与上下文准备：
   ```bash
   # 认领本次更新会话（获取独占租约，杜绝需认领状态）
   awr session start --work <SPEC-ID> --agent spec-update --provider omp --model default --claim --ttl-ms 3600000 --expected-revision <REV>
   # 绑定会话准备聚焦上下文
   awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary
   ```
   从输出中提取既有验收边界、历史变更与当前依赖。若缺少 `executor/summary.html`，先用 spec-execute 完成原功能
2. **确定更新编号**：检查 `updater/` 下已有的 `update-*.html`，确定下一个编号；若 `updater/` 不存在则创建
3. **确认当前 Spec 分支**：读取 `writer/plan.html` 头部 `.rk-meta` 的分支 / 基准分支 / PR 信息，调用 `/git-work` 的“复用 Spec 分支”模式，确认当前分支与 `git_branch` 一致
4. **创建 updater/update-xxx.html**：参照 [references/update-template.html](references/update-template.html)，严格结合 AWR 准备输出中的增量验收标准在 `updater/` 下创建；完整填写 `rk:*` meta 与 `rk-*` link，`.rk-meta` 镜像同样字段，并继承 `writer/plan.html` 的分支 / 基准分支 / PR 元信息
5. **等待用户确认**：使用当前运行环境的确认方式（节点 1），确认后向 AWR 提交 `update` 会话检查点：
   ```bash
   AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
   bash "$AWR_CP" --work <SPEC-ID> --agent spec-update --digest "spec-update: update-xxx 方案确认，准备进入实现" --next-action "spec-update: 按方案执行代码更新与单测"
   ```
6. **检索历史经验与本体影响面**：调用 `/exp-search <关键词>`；若项目存在 `spec/context/ontology/ontology.json`，运行本体子图查询确认上下游影响面与回归边界：
   ```bash
   node .agents/skills/project-ontology/scripts/query-ontology.js \
     spec/context/ontology/ontology.json \
     --target "<变更模块/字段>" --direction both --depth 2 --freshness --repo .
   ```
7. **创建任务清单**：根据 `updater/update-xxx.html` 的"实现步骤"章节创建
8. **按方案实现更新**：严格遵循方案，不修改方案之外的代码
9. **编写/更新测试**：新增测试 + 修改测试 + 回归测试
10. **运行测试验证**：全部通过才能继续
11. **创建 updater/update-xxx-summary.html**：参照 [references/summary-template.html](references/summary-template.html)，应用 html-report 契约：完整 `rk:*` meta + `rk-*` link 双轨元信息、`rk-verdict` 结论块、`rk-cal ok` / `rk-cal warn` 组件、`rk-links` / `rk-backlinks` 双向关联，修订遵循 `data-rev` 规范；继承 update 报告的 Git 元信息，并在第 6.3 节登记待 `spec-end` 汇总的规范与本体变更线索（同时在 `update-xxx.html` 的 `rk-backlinks` 补上本总结的反链）。本步修订或新建的每份报告都要过结构机检（退出码 0）：`node .agents/skills/html-report/scripts/check-report.js <SPEC-DIR>`；其中 update 报告至少含结构图或流程条、update-summary 至少含指标卡或流程条（放在结论块之后）；图按内容选择，不按字数凑图，单段建议 150 字以内便于扫读，详尽证据用表格或代码保留、不得删减
12. **使用 spec-review 审查**：生成 `reviewer/update-xxx-review.html`；审查报告产出后，回到 `update-xxx.html` / `update-xxx-summary.html` 的 `rk-backlinks` 把「审查报告」反链补齐（原先标注「待创建」的条目同步去掉标注）
13. **等待用户确认审查报告**：使用当前运行环境的确认方式（节点 2）
14. **交接统一收尾（不设独立收尾）**：更新 `lead/team-context.md` 的「任务进度」（必要时更新「问题闭环记录」与「决策记录」），提交 AWR 阶段检查点（**不传 `--end`**，会话留待后续 update 或 `spec-end` 接力），并通知 TeamLead：本轮 `update-xxx` 已通过测试与审查，可继续下一轮 `spec-update` 或启动 `spec-end` 执行统一收尾（经验沉淀、规范与本体同步、提交推送与 PR/归档）。

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
1. 在 `updater/update-xxx-summary.html` 第 6.3 节记录本次触发的长期规则或项目本体变更线索（不自行调用 `/exp-reflect`、不直接修改 `AGENTS.md`/`.agents/rules/`/全局本体，全部交由 `spec-end` 统一审定落盘）
2. 不执行独立的 `git commit` / `push` / 创建 PR / 归档操作，全部交由 `spec-end` 统一收尾
3. 更新 `lead/team-context.md` 的「任务进度」，必要时更新「问题闭环记录」和「决策记录」
4. 保留在原 Spec 目录，不归档
5. 向 AWR 提交更新完成阶段检查点（不传 `--end`，由 `spec-end` 最终核验并释放会话）：
   ```bash
   AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
   bash "$AWR_CP" --work <SPEC-ID> --agent spec-update --digest "spec-update: 完成 update-xxx 更新、回归与审查，交由 spec-end 统一收尾" --next-action "spec-ender: 执行 spec-end 统一收尾（或继续 spec-update）"
   ```
