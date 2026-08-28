---
disable-model-invocation: true
name: spec-swarm
description: >
  当用户要求以「Agent 主控 + 全程 spawn 子 Agent」的方式启动 R&K Flow 开发流程时使用：
  当前 Agent 只做编排（账本、门禁代问、批次调度），七个角色的实质工作一律交子 Agent 执行。
  典型信号：用户说"用 swarm 模式启动"/"蜂群模式"/"所有任务都 spawn 子 Agent 做"/"你只做主控不要自己写代码"。
  本 Skill 只做前置校验、写入 execution 字段、声明编排硬约束，随后委派 spec-start 跑既有五阶段流程。
  不要用于运行时不支持子 Agent 的环境（退回 spec-start 串行路径）、已有活跃 Spec 的小迭代（用 spec-update），
  也不要用它替代 spec-start —— 流程本体、账本模板、门禁定义仍由 spec-start 唯一承载。
---

# Spec Orchestrate

`spec-start` 的**执行形态启动器**，不是第二套流程。它只决定「谁执行」，随后把控制权交回 `spec-start`。

## 运行契约

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 用户的任务描述、当前运行时的子 Agent 能力实况、已有的角色定义（`.omp/agents/` 或 `~/.omp/agent/agents/`） |
| 权限 | 写账本 `execution` 字段、spawn 与调度角色、代问门禁；**不写任何角色产物**（报告、代码、测试一律交子 Agent） |
| 验证 | 前置三项逐条实测通过（角色可发现、可 spawn、批次 schema 正确）；`execution: swarm` 已落账本 |
| 停止 | 前置任一项不满足 → 停止并按「前置不满足」节处置，不静默降级；`mode` 的选择本身仍是永远门禁 |
| 升级 | 角色连续 spawn 失败、递归深度触顶、或用户要求主控亲自动手实质工作时，停止并交回用户决策 |

## 核心原则

1. **主控不干活**：当前 Agent 是编排者。角色产物（`explorer/` `writer/` `tester/` `executor/` `debugger/` `reviewer/` `ender/` 下的一切）一律由对应子 Agent 产出。主控自己写就是本模式的失败。
2. **`execution` 与 `mode` 正交**：`execution` 决定谁执行，`mode` 决定谁验证。四种组合全部合法，见下。
3. **账本仍归 TeamLead**：`lead/team-context.md`（或 `.html`）与 `rk-manifest.js` 的维护职责一行不变，仍由主控独占。这不是例外，是 TeamLead 的固有职责。
4. **门禁必须代问**：子 Agent 没有 `ask` 工具（实测），无法触达用户。任何需要用户表态的节点都由主控代问。
5. **流程不复制**：五阶段、四门禁、账本模板、修复循环预算的唯一真相源是 `spec-start`。本 Skill 不重述，只补充编排约束。

## `execution` 与 `mode` 正交

账本 frontmatter 并列两个字段：

```yaml
mode: gated | autopilot            # 谁验证（.agents/rules/spec-workflow.md）
execution: swarm | serial   # 谁执行（本 Skill）
```

| 组合 | 含义 | 何时用 |
|------|------|--------|
| `swarm` + `gated` | 子 Agent 干活，每个门禁仍等用户放行 | **本 Skill 默认**。要并行产能又要自己把关 |
| `swarm` + `autopilot` | 子 Agent 干活，门禁靠机械证据自放行 | 长任务无人值守 |
| `serial` + `gated` | 主控按角色协议串行自演，门禁等人 | `spec-start` 的降级路径 |
| `serial` + `autopilot` | 主控串行自演，自门禁 | 小任务无人值守 |

`execution: swarm` 不放宽任何标准。三条 Iron Law（测试先行 / 根因优先 / 新鲜验证）与永远门禁清单在两种 `execution` 下完全等效——它们约束的是角色行为，与角色跑在主进程还是子进程无关。

## 步骤 1：前置校验（三项，逐条实测）

不要靠读文档判断，要靠实际结果判断。

**1.1 角色可发现**

```bash
ls .omp/agents/spec-explorer.md 2>/dev/null || ls ~/.omp/agent/agents/spec-explorer.md
```

项目级 `.omp/agents/` 优先于用户级 `~/.omp/agent/agents/`。OMP 只发现这两处，**明确跳过** `.claude/agents` 与 `.codex/agents`。七个角色缺任一个 → 回 `spec-init` 的角色步骤补齐。

**1.2 角色可 spawn**

用最小任务实拉一个角色，确认返回而非报 `Unknown agent`：

```text
{ context: "discovery probe", tasks: [{ name: "spec-explorer", agent: "spec-explorer",
  task: "Do not use tools. Reply exactly: ROLE=spec-explorer ACK=ok" }] }
```

**1.3 工具集完整**

角色定义**不得**有 `tools` 白名单行。`tools` 一旦出现即成白名单，漏掉 `bash`/`write`/`edit` 会让角色中途卡死。省略即继承完整启用工具集。

```bash
grep -l '^tools:' .omp/agents/spec-*.md ~/.omp/agent/agents/spec-*.md 2>/dev/null
```

有输出即不合格。

## 步骤 2：确认运行模式并写入账本

`mode` 的选择本身是永远门禁——**不能自动驾驶地决定进入自动驾驶**。用 `intent-confirmation` 向用户确认 `mode`，同时告知本次 `execution: swarm`。

确认后按 `spec-start` 步骤 4 创建账本，frontmatter 两个字段并列写入。各报告的 `rk:mode` 照常；`execution` 只落账本，不进报告 meta——它是运行形态，不是报告属性。

## 步骤 3：声明编排硬约束

把以下三条写入账本「下一步动作」或备注，作为本次运行的约束记录。

**3.1 主控只做四件事**

| 允许 | 说明 |
|------|------|
| 维护账本 | `lead/team-context.md`、`rk-manifest.js`。TeamLead 固有职责，并发写会互相覆盖 |
| 代问门禁 | 子 Agent 无 `ask`；所有用户确认节点由主控发起 |
| 调度与记账 | spawn / `hub send` 续接 / 更新「角色运行句柄」 |
| 读取核对 | 读子 Agent 产物以判断门禁与下一步。读可以，改不行 |

除此之外的一切落笔——产品代码、报告、测试、修复——都必须 spawn 对应角色。**没有「就一行」「顺手改」的豁免**：豁免无法机械判定，一开口子整个模式就失效。

**3.2 角色不互相 spawn**

七个角色一律 `spawns: ""`，深度 1。角色之间不直接 spawn，跨角色协作走主控中转或 `hub` 消息。放开 `spawns` 会让孙 Agent 不在账本句柄表里，审计轨断裂。

**3.3 续接只发消息**

`running` / `idle` / `parked` 一律 `hub send` 续接同一实例（`parked` 收消息自动复活且上下文完整）。只有 `aborted` 才重新 spawn 并从账本与产物重建上下文。同名再 spawn 会得到零历史的影子角色。

## 步骤 4：委派 spec-start

调用 `spec-start`，从它的**步骤 1（需求对齐）**开始跑完整五阶段。本 Skill 到此结束，不重复它的任何内容。

传递给 `spec-start` 的增量信息只有两条：

- `execution: swarm`，已落账本
- 步骤 3 的三条硬约束已声明

`spec-start` 的既有编排规则（阶段顺序、四门禁、修复循环预算、handle 记账）全部照原样生效。

批次编排细则（哪些角色可同批、handle 记账时机、失败处置）见 [references/spawn-orchestration.md](references/spawn-orchestration.md)。开始阶段二前必读。

## 前置不满足时

不静默降级——降级改变了用户拿到的东西，必须让用户知道。

| 情况 | 处置 |
|------|------|
| 角色定义缺失 | 报告缺哪几个，问用户：补齐（回 `spec-init` 角色步骤）还是改走 `serial` |
| 运行时不支持 spawn | 说明本模式不可用，问用户是否接受 `spec-start` 的 `serial` 路径 |
| 角色带 `tools` 白名单 | 报告文件名，问用户是否删除该行（删了才继承完整工具集） |
| spawn 实测失败 | 附命令与原文错误，交回用户决策，不重试第三次 |

用户选 `serial` → 账本写 `execution: serial`，直接调 `spec-start`，本 Skill 退出。

## 常见陷阱

- 主控自己写了角色产物（本模式最常见的失败，且往往以「这个很简单」开头）
- 把 `execution` 做成 `mode` 的第三个枚举值 → 表达不了「全 spawn 且仍等人」
- 让子 Agent 调 `ask` 去问用户 → 它没有这个工具，会静默失败或自己编答案
- 把账本交给子 Agent 维护 → 多角色并发写互相覆盖
- 靠读 `spec-init` 文档就断定角色已就位，没实测 spawn
- 给角色写 `tools` 白名单当作「安全边界」→ 边界属角色 rules，白名单只会让角色卡死
- 复制 `spec-start` 的账本模板或门禁表进本 Skill → 第二套真相源，必然漂移
- 前置不满足时静默改走串行，不告知用户
