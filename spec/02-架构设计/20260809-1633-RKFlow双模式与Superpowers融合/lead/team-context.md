---
type: team-context
schema_version: 1
team_name: spec-20260809-1633-RKFlow双模式融合
spec_dir: spec/02-架构设计/20260809-1633-RKFlow双模式与Superpowers融合
task_description: R&K Flow 引入门禁/自动驾驶双运行模式，并按接收方吸收 Superpowers 行为纪律
status: running
phase: testing
runtime: omp
git_branch: docs/spec-20260809-rk-flow-dual-mode-superpowers
base_branch: master
pr_url:
created_at: 2026-08-09T16:33:00+08:00
updated_at: 2026-08-09T20:10:00+08:00
---

# 团队运行账本

## 当前运行路径

| 步骤 | 阶段 | 负责角色 | 动作 | 状态 | 产物 | 门禁 | 更新时间 |
|------|------|----------|------|------|------|------|----------|
| 1 | intent | TeamLead | 需求对齐（理解转述 → 反问梳理 → 收敛确认） | done | lead/team-context.md | gate-1 | 2026-08-09T16:33:00+08:00 |
| 2 | intent | TeamLead | 创建 Spec 工作分支（base=master） | done | — | — | 2026-08-09T16:33:00+08:00 |
| 3 | exploration | spec-explorer | 探索 Superpowers 全量内容 + R&K 接收面 | done | explorer/exploration-report.html | — | 2026-08-09T17:10:00+08:00 |
| 4 | spec-writing | spec-writer | 撰写设计方案 | done | writer/plan.html | gate-2 | 2026-08-09T18:05:00+08:00 |
| 5 | spec-writing | TeamLead | 发起门禁 2 用户确认 | done | — | gate-2 | 2026-08-09T18:15:00+08:00 |
| 6 | implementation | spec-executor | P0-1 常驻规则层（.agents/rules/ + .claude/ 镜像） | done | .agents/rules/spec-workflow.md | — | 2026-08-09T18:30:00+08:00 |
| 7 | implementation | spec-executor | P0-2 账本模板（mode/依据列/判定方式/角色句柄三列） | done | spec-start/SKILL.md | — | 2026-08-09T18:40:00+08:00 |
| 8 | implementation | spec-executor | P0-3~P0-5 六 Skill 模式化 + executor 测试所有权 | done | spec-execute/SKILL.md 等 | — | 2026-08-09T19:00:00+08:00 |
| 9 | implementation | spec-executor | P1-1~P1-6 debug/review/write/skill-creator/update | done | 各 SKILL.md + 6 个 references | — | 2026-08-09T19:15:00+08:00 |
| 10 | implementation | spec-executor | P2 账本格式放开 + 导航树实现 + 路径修正 | done | rk-report.js、rk-report.css、15 个模板 | — | 2026-08-09T19:30:00+08:00 |
| 11 | testing | spec-tester | P3-1 行为验证：三条 Iron Law 压力测试（基线 → 加规则 → 封堵后回归） | done | tester/artifacts/pressure-tests/run-2026-08-09/ | — | 2026-08-09T20:10:00+08:00 |

> 本次为单 Agent 串行执行模式（用户决策 D-002）：无角色 spawn，由当前 Agent 按七角色协议依次承担职责。

## 任务进度

> 共享维护区：各角色只追加或更新自己负责的任务行。

| 任务号 | 负责角色 | 任务 | 状态 | 产物 | 完成时间 | 更新者 |
|--------|----------|------|------|------|----------|--------|
| T-001 | TeamLead | 需求对齐与前置检查 | done | lead/team-context.md | 2026-08-09T16:33:00+08:00 | TeamLead |
| T-002 | spec-explorer | 探索 Superpowers 14 skill + R&K 接收面 | done | explorer/exploration-report.html | 2026-08-09T17:10:00+08:00 | spec-explorer |
| T-003 | spec-writer | 撰写双模式融合设计方案 | done | writer/plan.html | 2026-08-09T18:05:00+08:00 | spec-writer |

## 问题闭环记录

> 共享维护区：发现或解决问题的角色只追加或更新自己相关的问题行。
> 不只记 bug，任何影响推进的过程性问题都记：「分类」取 `bug` | `blocker` | `process` | `env` | `dependency` | `scope`。

| 问题号 | 分类 | 发现者 | 负责角色 | 问题 | 解决方案 | 关联产物 | 状态 | 更新者 |
|--------|------|--------|----------|------|----------|----------|------|--------|
| I-001 | dependency | TeamLead | TeamLead | `.agents/roles/` 不存在，7 个项目级角色定义缺失，不满足 spec-start 前置检查 | 本次按用户决策 D-002 走单 Agent 串行执行；补齐角色定义列为方案的待修项 | lead/team-context.md | open | TeamLead |
| I-002 | process | TeamLead | TeamLead | 主分支实际名为 `master`，但 spec-start 步骤 2 与 spec-end 步骤 7 写死 `main` | 本次 base 分支用 `master`（决策 D-003）；「main 写死」列为方案待修项 | lead/team-context.md | open | TeamLead |
| I-003 | process | TeamLead | spec-writer | 分类目录名两套并存：spec-write 规定 `01-产品规划/02-技术设计/03-能力交付/04-系统改进/05-验证工程`，仓库实际为 `01-项目规划/02-架构设计/03-功能实现/04-问题修复/05-测试文档` | 本次落仓库实际的 `02-架构设计`（决策 D-004）；目录名漂移列为方案待修项 | lead/team-context.md | open | TeamLead |
| I-004 | scope | TeamLead | spec-writer | 待审的 GPT r2 方案存在多处与 Superpowers 仓库不符的事实陈述（拒绝了不存在的 Execution Capsule / JSONL Trace；把 SDD 工作区误认为要拒绝的文件体系；5 轮修复上限挂错到调试） | 本次方案基于实际仓库重写，并在方案中列明被纠正的事实 | writer/plan.html | open | TeamLead |
| I-005 | process | spec-writer | spec-writer | `html-report/SKILL.md:38` 规定账本保持 Markdown 的理由是「被 hook 同步脚本解析」，但 hook 机制已在 v2.6.0 整套移除（`README.md:1196`），该理由已失效 | 账本改 HTML 无需推翻原设计，只需同步删除失效理由；`:54`、`:130` 两处 hook 表述一并清理 | writer/plan.html | open | spec-writer |
| I-006 | bug | spec-writer | spec-writer | 账本相对路径错误：`plan-template.html:28` 与 `html-report/SKILL.md:67` 都写 `../../lead/team-context.md`，但从角色目录 `../..` 是分类目录，正确应为 `../lead/` | 本报告使用正确路径 `../lead/`；模板与契约的路径错误列为方案待修项（P2-3） | writer/plan.html | open | spec-writer |
| I-007 | env | spec-writer | spec-writer | 导航树无法用 `fetch` 探测同级文件：`file://` 下浏览器安全策略直接拒绝 fetch，已存在的 `exploration-report.html` 也返回 `Failed to fetch`（本地实测确认） | 改用 `rk-manifest.js` + `<script src>` 声明式清单，实测在 `file://` 下正常加载；方案 6.1 节记录 | writer/plan.html | resolved | spec-writer |
| I-008 | scope | spec-writer | spec-writer | GPT r2 方案自述「只写 README 就只剩口号」为最高风险，却把唯一常驻加载的 `.agents/rules/` 排在最低优先级档 —— 自相矛盾 | 本方案实施顺序按「强制力载体」排序，`.agents/rules/` 定为 P0-1 必须最先 | writer/plan.html | resolved | spec-writer |
| I-009 | process | spec-executor | spec-executor | `.claude/rules/` 镜像严重漂移：只有 2 个文件（`.agents/rules/` 有 5 个），且 `spec-workflow.md` 还写着 `plan.md`（早已改为 `plan.html`）、`execution_mode 固定为 single-agent`（与多模式矛盾）、`coding-style.md` 仍引用 Obsidian（v2.7.0 已移除） | 以 `.agents/rules/` 为准同步全部 5 个文件，逐一 `cmp` 校验一致 | .claude/rules/ | resolved | spec-executor |
| I-010 | bug | spec-executor | spec-executor | 账本相对路径错误扩散范围远超预估：不是 2 处而是 **40 处**，横跨 13 个文件（含全部 6 个报告模板） | 脚本批量改为 `../lead/`；同时验证跨 Spec 引用 `../../{分类目录}/` 与记忆库 `../../../context/` 未被误伤 | 13 个文件 | resolved | spec-executor |
| I-011 | bug | spec-executor | spec-executor | 「账本必须保持 Markdown」的论断散布 9 个文件，其中 `.agents/rules/documentation.md`（常驻层，优先级最高）与 `spec-start`（账本的创建者）会直接否决 D-012——不改则 HTML 账本永远不会被创建 | 九处统一改为「`.md` / `.html` 皆可，HTML 时豁免修订标记」；记忆库保持 Markdown 不变 | .agents/rules/documentation.md 等 | resolved | spec-executor |
| I-012 | bug | spec-executor | spec-executor | 导航树是死功能：`html-report/SKILL.md` 写了完整契约，但 `rk-report.js` 只有 66 行修订逻辑、无任何 nav 渲染代码；且 15 个报告模板全部缺 `<script src="../rk-manifest.js">` 与 `<nav class="rk-nav">` 挂载点 | 实现 `renderNav()`（读 `RK_SPEC_TREE` → 按 role 分组 → 建树 → 比对路径高亮）；脚本批量给 9 个模板文件接线；`spec-start` 加 manifest 脚手架与「登记产物即追加条目」规则 | rk-report.js、15 个模板 | resolved | spec-executor |
| I-013 | process | spec-executor | spec-executor | `git-work/reference.md:43` 与 `SKILL.md:102` 都把「读远程默认分支」写成 `main` 不存在时的回退路径，即把回退当主路径 | 改为始终先读 `git symbolic-ref refs/remotes/origin/HEAD`，仅命令失败才退回当前分支；实跑确认本仓库返回 `master` | git-work/ 三个文件 | resolved | spec-executor |
| I-014 | bug | spec-tester | spec-executor | 压力测试发现「测试先行」被**规避**（三分法最危险的一类）：加规则后模型不再直说「不写测试」，改为「把偏离登记进账本 + 照样往下写」——它用「依据：用户原话」满足了我自己定的依据三形式，从而自认合规。等于把 Iron Law 降级成可登记的偏离项 | 在 `.agents/rules/spec-workflow.md` 三条 Iron Law 后补三段封堵：①不因用户授权失效（「我担责」「就这一次」是压力不是授权）②登记进账本不等于合规（依据列不是破例开票）③唯一跳过路径=降级门禁模式+用户明确同意+此后禁用「已验证」字样。封堵后同场景重跑两次均为遵守 | tester/artifacts/pressure-tests/run-2026-08-09/ | resolved | spec-tester |

## 决策记录

> 共享维护区：任何角色遇到需要用户或角色拍板的岔路口，落一行。记录当时给了哪些选项、
> 选了什么、为什么、谁拍的板。被否决的选项不要删，它是复盘的关键上下文。
> 与「门禁决策」的区别：门禁决策只记阶段门禁通过/驳回；决策记录记每一个实质取舍及其理由。

| 决策号 | 阶段 | 提出者 | 议题 | 候选项 | 结论 | 理由 | 拍板者 | 决策时间 | 依据 |
|--------|------|--------|------|--------|------|------|--------|----------|------|
| D-001 | intent | TeamLead | 融合层级 | A 完整移植 Superpowers 架构 / B 行为层融合 / C 只在 README 写原则 | B 行为层融合 | 保留 R&K 的项目治理与人类可读产物，只吸收工程执行纪律；A 与 R&K 重复且削弱阅读体验，C 无强制力只剩口号 | user | 2026-08-09T16:20:00+08:00 | 用户原话「结合你对 OMP 与 Superpowers 的实际理解，重写为贴近 R&K Flow 真实仓库现状的方案」 |
| D-002 | intent | TeamLead | 缺失的 7 个项目级角色定义如何处理 | A 先按 spec-init 源文本补齐 .agents/roles/ / B 本次跳过，单 Agent 串行执行 / C 补齐并同时创建 .omp/agents/ | B 单 Agent 串行执行 | 本次 Spec 只产出设计方案不改实现，串行足够；spec-start 明确允许无团队能力时由当前 Agent 按同一角色协议串行执行 | user | 2026-08-09T16:30:00+08:00 | `.agents/roles/`、`.omp/agents/`、`.claude/agents/` 三处均不存在（glob 确认）；`spec-start/SKILL.md` 允许串行降级 |
| D-003 | intent | TeamLead | base 分支用哪个 | A 用 master（仓库现状）/ B 先把 master 改名为 main / C 用 master 但不写进方案待修项 | A 用 master，并把「main 写死」列为方案待修项 | 尊重仓库现状，避免高风险的远端默认分支变更；同时不放过 skill 与现实不符这个真实缺陷 | user | 2026-08-09T16:30:00+08:00 | `git branch` 显示主分支为 `master`；`spec-start/SKILL.md` 步骤 2 与 `spec-end/SKILL.md:138` 写死 `main` |
| D-004 | intent | TeamLead | 本次 Spec 落哪个分类目录 | A 落 02-架构设计（仓库实际）/ B 新建 02-技术设计（spec-write 规定） | A 落 02-架构设计 | 不新增并行分类目录以免加重漂移；目录名不一致作为方案待修项处理 | user | 2026-08-09T16:30:00+08:00 | 仓库 `spec/` 下实际存在 `02-架构设计`；`spec-write/SKILL.md:47-52` 规定 `02-技术设计` |
| D-005 | intent | TeamLead | 本次 Spec 产出范围 | A 只产出 writer/plan.html / B 方案 + 立即实施 P0 / C 方案 + 全部实施 + 压力测试验证 | A 只产出设计方案 | 改造面覆盖 11 个 Skill 与 rules，需逐个验证；先定方案再分批实施，降低一次性大改的漂移风险 | user | 2026-08-09T16:30:00+08:00 | 用户确认只评审并重写方案，不动 Skill 实现 |
| D-006 | intent | TeamLead | 双运行模式的语义 | A 快慢开关（自动驾驶=少确认）/ B 换验证器（人退出的每个门禁都要有机械纪律补位） | B 换验证器 | 「少确认」会让质量随模式下降；「换验证器」使每条吸收来的纪律都有精确落点，且能区分哪些在门禁模式下可放宽、哪些是自动驾驶硬底线 | user | 2026-08-09T16:20:00+08:00 | 用户原话「自动驾驶模式下问题与决策必须完整落账本且必须有可追的决策依据」 |
| D-007 | intent | TeamLead | 自动驾驶下「决策依据」的形式要求 | A 自然语言理由即可 / B 只接受三种可机械校验形式（文件路径+行号 / 命令+退出码+输出位置 / 用户原话引用） | B 三种形式 | 理由可以被生成，依据必须可追。可机械校验才能事后判断自动驾驶是否诚实 | user | 2026-08-09T16:20:00+08:00 | 现行决策记录九列有「理由」无「依据」（`spec-start/SKILL.md:222-224`） |
| D-008 | spec-writing | spec-writer | 纪律承载方式 | A 把 Iron Law 正文迁进各 SKILL.md / B 三层承载（rules 常驻 + 运行契约触发条件 + references 细则） | B 三层承载 | 迁正文会让已超标的 SKILL.md 进一步膨胀并稀释新规则；上游自身就是这个分法 | user | 2026-08-09T17:40:00+08:00 | `spec-test` 28.8KB / `spec-init` 26.5KB / `spec-start` 23.8KB 均超 `writing-skills` 的 500 行预算；上游 `systematic-debugging/` 把 Iron Law 留 SKILL.md 而 `root-cause-tracing.md` 等三文件独立 |
| D-009 | spec-writing | spec-writer | Iron Law 是否也下沉 references | A 一并下沉 / B 留在常驻 rules | B 留常驻 | 下沉等于让被约束者自己决定是否加载约束自己的规则，正是 `using-superpowers` Red Flags 表针对的失败模式；R&K 角色都是零历史 subagent | user | 2026-08-09T17:40:00+08:00 | 所有 spec-* 均含 `disable-model-invocation: true`；`.agents/rules/` 经 AGENTS.md @import 每次会话自动加载 |
| D-010 | spec-writing | spec-writer | `receiving-code-review` 那套放哪（原 B-003） | A 放 `.agents/rules/` / B 新建独立 skill | A 放 rules | 它约束的是任何角色收到任何审查意见时的行为，不是有始有终的流程；做成 skill 则收到批评的那一刻不会被加载 | spec-writer（待用户确认） | 2026-08-09T18:00:00+08:00 | 方案 3.2.3 节；`.agents/rules/spec-workflow.md` 当前仅约 9 行，有容量 |
| D-011 | spec-writing | spec-writer | `task.agentIdleTtlMs` 取值 | A 保持默认 420000ms / B 设 0 永不 park / C 调至 30 分钟 | A 保持默认 | park 无损（消息即自动复活，本次实测确认）；设 0 会把 7 个角色 session 长钉内存 | spec-writer（待用户确认） | 2026-08-09T18:00:00+08:00 | 向 40 分钟前 parked 的 `TddAndTests` 发 hub send 并禁止重读文件，其准确复述初始任务与结论，hub 返回 `revived` |
| D-012 | spec-writing | user | 账本 HTML 化是否套修订标记 | A 与报告同规格含 data-rev / B 改 HTML 但豁免修订标记 / C 保持 Markdown | B 改 HTML 豁免修订标记 | 账本是高频追写的运行流水而非定稿后修订的报告，强制 data-rev 会使其膨胀；但需复用样式与导航树 | user | 2026-08-09T17:55:00+08:00 | 用户原话「账本改 HTML，但不用修订标记」；且 `html-report/SKILL.md:38` 要求 Markdown 的 hook 理由已失效（见 I-005） |
| D-013 | spec-writing | spec-writer | 导航树实现方式 | A JS 运行时 fetch 探测 / B 各报告静态内嵌树 / C 生成 index.html 入口页 / D `rk-manifest.js` 声明式清单 | D manifest + `<script src>` | 用户倾向 A 的免维护，但 A 在 `file://` 下渲染空树（实测）；D 同时满足免维护与离线可读 | spec-writer（待用户确认） | 2026-08-09T18:00:00+08:00 | 实测：`file://` 下 fetch 已存在的 `exploration-report.html` 返回 `Failed to fetch`；同环境 `<script src="../rk-manifest.js">` 成功加载并输出 docs=3 |
| D-014 | spec-writing | spec-writer | 分类目录名以哪套为准（原 I-003 处置） | A 以仓库实际为准改 spec-write / B 以 spec-write 为准重命名目录 | A 改 spec-write 向仓库对齐 | 重命名目录会让已归档 Spec 的引用路径全部失效 | spec-writer（待用户确认） | 2026-08-09T18:00:00+08:00 | 仓库实际为 `01-项目规划/02-架构设计/03-功能实现/04-问题修复/05-测试文档`，与 `spec-write/SKILL.md:47-52` 不一致 |
| D-015 | spec-writing | spec-writer | 自动驾驶默认档位是否允许 push 与建 PR（原 B-001） | A 允许 push + 建 PR / B 只允许本地提交 / C 连提交也要确认 | A 允许 push 工作分支 + 建 PR，禁止合并/force/碰 master | push 到工作分支与建 PR 都可逆且可关闭，PR 本身就是给人审的入口；合并与 force 不可逆故留永远门禁 | spec-writer（待用户确认） | 2026-08-09T18:10:00+08:00 | 方案 3.3.1 永远门禁清单按可逆性划定；`git-work/SKILL.md` 现有分支隔离机制 |
| D-016 | spec-writing | spec-writer | 模式粒度（原 B-002） | A 两个命名模式 + 不可关闭的永远门禁清单 / B 逐门禁开关矩阵 | A 两个命名模式 | 开关矩阵会长成配置地狱，且每个组合都需单独验证；两模式 + 清单已覆盖实际需求 | spec-writer（待用户确认） | 2026-08-09T18:10:00+08:00 | 方案 3.3 门禁—验证器映射表共 7 个门禁，逐个开关将产生 2^7 组合 |
| D-017 | spec-writing | spec-writer | `rk-manifest.js` 维护主体 | A 每次生成报告的角色自行更新 / B 由 TeamLead 统一更新 | B TeamLead 统一更新 | 避免多角色并发编辑同一 manifest 产生冲突 | spec-writer（待用户确认） | 2026-08-09T18:10:00+08:00 | 方案 6.1 节；R&K 现有「TeamLead 维护控制面」边界（`README.md` 共享维护边界） |
| D-018 | testing | spec-tester | 「根因优先」这条 Iron Law 是否保留 | A 删除（基线已自发做对，按压力测试法第 2 条应删）/ B 保留但重定位价值 | B 保留并重定位为「统一验证手段」 | 基线确实自发拒绝了直接改码，所以它对「是否往上游追」无增量；但加规则后出现了基线没有的动作——把 tester 场景固化成失败测试先跑红。增量在验证手段的一致性，不在防止直接改码 | spec-tester | 2026-08-09T20:05:00+08:00 | 基线输出「我先不改那一行…往上追 user 这个 prop 的来源」vs 加规则后「把 tester 的场景固化成一个失败测试，跑一次看它红」，见 tester/artifacts/pressure-tests/run-2026-08-09/iron-law-pressure-test.md |

## 角色运行句柄

| 角色 id | 适配层 | 运行时角色名 | agent_id | thread_id | session_id | 状态 | 续接方式 | 累计参与 Spec 数 | 最近产物 | 更新时间 |
|---------|--------|--------------|----------|-----------|------------|------|----------|------------------|----------|----------|
| — | 单 Agent 串行 | 当前 Agent 兼任七角色 | — | — | — | running | n/a | 1 | lead/team-context.md | 2026-08-09T19:30:00+08:00 |

> 按决策 D-002，本次不 spawn 角色线程；`.agents/roles/` 缺失见 I-001。
>
> 本次顺带实测了角色持久化机制（支撑方案 3.4 与 D-011）：向本会话中 40 分钟前跑完、已处于 `parked` 的 librarian subagent 发 `hub send`，明确要求「只凭记忆回答、不许重读文件」，其准确复述了初始任务要求与自身结论，`hub` 返回 `revived`。结论：`parked` 状态完整保留上下文，续接可行；能力早已存在，缺的是 R&K 侧协议。

## 产物注册表

| 产物 | 负责角色 | 状态 | 已确认 | 更新时间 |
|------|----------|------|--------|----------|
| lead/team-context.md | TeamLead | done | n/a | 2026-08-09T16:33:00+08:00 |
| explorer/exploration-report.html | spec-explorer | done | no | 2026-08-09T17:10:00+08:00 |
| writer/plan.html | spec-writer | done | no | 2026-08-09T18:05:00+08:00 |
| rk-manifest.js | TeamLead | done | n/a | 2026-08-09T19:30:00+08:00 |
| tester/artifacts/pressure-tests/run-2026-08-09/iron-law-pressure-test.md | spec-tester | done | n/a | 2026-08-09T20:10:00+08:00 |

## 门禁决策

| 门禁 | 确认对象 | 决策 | 判定方式 | 决策时间 | 备注 |
|------|----------|------|----------|----------|------|
| gate-1 | 需求对齐 | passed | user | 2026-08-09T16:30:00+08:00 | 用户确认角色处理方式、base 分支、产出范围、分类目录四项（D-002~D-005） |
| gate-2 | writer/plan.html | passed | user | 2026-08-09T18:15:00+08:00 | 用户选择「通过，按推荐结论实施」；7.2 节 7 项决策（D-010、D-011、D-013~D-017）推荐结论全部生效 |

## 角色交接

| 来源角色 | 接收角色 | 交接原因 | 产物 | 状态 | 更新时间 |
|----------|----------|----------|------|------|----------|
| TeamLead | spec-explorer | 需求已对齐，进入阶段二探索 | lead/team-context.md | done | 2026-08-09T16:33:00+08:00 |
| spec-explorer | spec-writer | 探索完成，进入方案撰写 | explorer/exploration-report.html | done | 2026-08-09T17:10:00+08:00 |
| spec-writer | TeamLead | 方案定稿，交回 TeamLead 发起门禁 2 | writer/plan.html | done | 2026-08-09T18:05:00+08:00 |

## 修复循环预算

> 修复循环（spec-tester ↔ spec-debugger）的运行预算。值不写死在 Skill 中，
> 由 TeamLead 在进入阶段四修复循环前用 intent-confirmation 与用户确认后填入。
> 只跟踪两个上限：最大轮数、最大无进展轮数。

| 循环 | 最大轮数 | 最大无进展轮数 | 已用轮数 | 连续无进展 | 状态 | 用户已确认 | 更新时间 |
|------|----------|----------------|----------|------------|------|------------|----------|
| test-debug | 不适用 | 不适用 | 0 | 0 | not-started | n/a | 2026-08-09T16:33:00+08:00 |

> 按决策 D-005，本次 Spec 只产出设计方案，不进入实现与测试阶段，故不涉及修复循环。

## 开放问题与阻塞

| 编号 | 负责角色 | 问题或阻塞 | 状态 | 解决情况 |
|------|----------|------------|------|----------|
| B-001 | spec-writer | 自动驾驶默认档位是否允许 push + 建 PR | resolved | 已登记为 D-015（方案 7.2 节）：允许 push 工作分支 + 建 PR，禁止合并/force/碰 master |
| B-002 | spec-writer | 模式粒度：两个命名模式 + 不可关闭清单，还是逐门禁开关矩阵 | resolved | 已登记为 D-016（方案 7.2 节）：两个命名模式 + 永远门禁清单 |
| B-003 | spec-writer | receiving-code-review 那套放 `.agents/rules/` 还是新建 skill | resolved | 已登记为 D-010（方案 3.2.3 + 7.2 节）：放 rules |
| B-004 | TeamLead | 方案 7.2 节 7 项决策（D-010、D-011、D-013~D-017）需用户拍板才能进入实施阶段 | resolved | 门禁 2 通过时用户选择「按推荐结论实施」，7 项推荐结论全部生效 |
| B-005 | spec-writer | 编号空间冲突：plan §7 曾把 push/PR 与模式粒度写作 D-008/D-009，与账本已拍板的「纪律承载方式」「Iron Law 下沉」撞号 | resolved | 保留账本已拍板编号不动（有真实拍板时间，改号会破坏历史），改 plan §7 向账本对齐并拆为 7.1 已拍板 / 7.2 待拍板；push/PR 与模式粒度另取 D-015/D-016 |

## 下一步动作

实施已完成 P0-1 → P3-1 全部批次，含用户附加的账本格式放开与导航树，以及三条 Iron Law 的行为验证。剩余：

- **账本 HTML 化的实际迁移**：格式约束已在九处放开、CSS 与渲染已就绪，但本 Spec 账本仍是 `.md`。迁移属可选——需要时按 `html-report` 契约转换并更新 `rk-manifest.js` 的 `path`。
- **既存漂移待修**：`.agents/roles/` 仍缺失（I-001）；分类目录名两套并存（I-003 / D-014 已定方向为改 `spec-write` 向仓库对齐，尚未执行）。
- 收尾走 `spec-end`：`exp-reflect` 沉淀经验 + 规范维护审查 + 归档 + 推送 PR。
