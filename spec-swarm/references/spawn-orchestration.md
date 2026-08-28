# Spawn 编排细则

`spec-swarm` 的执行期参考。阶段二开始前读。

## 目录

- [批次划分](#批次划分)
- [spawn 报文形状](#spawn-报文形状)
- [handle 记账时机](#handle-记账时机)
- [门禁代问](#门禁代问)
- [失败处置](#失败处置)
- [并发写冲突](#并发写冲突)

## 批次划分

真并行只能由主控一次 `tasks[]` 发多个（角色自身 `spawns: ""`，无法自行 fan out）。判据是**产物依赖**，不是角色相似度。

| 阶段 | 可同批 | 必须串行 | 依据 |
|------|--------|----------|------|
| 二 前置 | `spec-explorer` 单独 | — | writer / tester 都要读它的报告 |
| 二 设计 | `spec-writer` + `spec-tester` | 两者都在 explorer 之后 | 各写各的文件，接口问题经主控中转 |
| 三 实现 | `spec-executor` 单独 | 在门禁 2 之后 | 需要已确认的 `writer/plan.html` |
| 四 测试 | `spec-tester` 单独 | 在 executor 之后 | 要测的是已落盘的实现 |
| 四 修复 | `spec-debugger` 单独 | 与 tester 交替，不同批 | 修复循环本质是串行的 |
| 四 审查 | `spec-reviewer` 可与 tester 同批 | — | 只读产物，不改实现 |
| 五 收尾 | `spec-ender` 单独 | 在门禁 4 之后 | 需要全部产物齐备 |

writer 与 tester 同批是唯一稳定的并行点。executor 与 tester 同批看似诱人，实际会让 tester 测到半成品——不要做。

## spawn 报文形状

OMP 16.4+ batch schema：

```text
{ context: "<共享背景：Spec 目录、分支、mode、账本路径>",
  tasks: [ { name: "<角色 id>", agent: "<角色 id>", task: "<完整自包含指令>" } ] }
```

三条硬性要求：

1. **`name` 必须显式等于角色 id**。省略会拿到随机生成名，之后无法按名寻址续接。
2. **`task` 必须自包含**。子 Agent 零对话历史，不知道此前发生了什么。必须写全：Spec 目录、要读哪些产物的具体路径、要产出什么、`mode` 是什么、账本路径。
3. **不用旧字段**。没有 top-level `agent`，不是 `assignment`/`id`/`description`。

`context` 放批次共享的背景，别在每个 `task` 里重复。

## handle 记账时机

每次 spawn / `hub send` / 状态变化后**立即**更新账本「角色运行句柄」，不攒批。跨进程（omp 重启）后 handle 全部失效，此时账本与落盘产物是唯一恢复路径——这就是不能攒批的原因。

四态与对应续接方式：

| 状态 | 含义 | 续接方式 |
|------|------|----------|
| `running` | 正在执行，可插话 steering | `hub-send` |
| `idle` | 跑完但 session 仍挂载 | `hub-send` |
| `parked` | 空闲超时释放，发消息即复活且上下文完整 | `hub-send` |
| `aborted` | 被取消或硬中断，终态不可复活 | `respawn+rebuild` |

只有 `aborted` 才允许重新 spawn。其余三态重新 spawn 都会产生影子角色。

## 门禁代问

子 Agent 无 `ask` 工具（实测：`ASK_TOOL_PRESENT=no`）。流程如下：

1. 子 Agent 产出报告，把「需要用户拍板的问题」写进最终输出交回主控
2. 主控读报告，用 `intent-confirmation` 向用户提问（`gated`）或核对机械证据（`autopilot`）
3. 主控把结果写入账本「门禁决策」，「判定方式」列填 `user` 或 `self+evidence`
4. 主控把用户回复原文传给下一批子 Agent 的 `task`

`autopilot` 下「依据」列只接受三种形式：文件路径+行号 / 命令+退出码+输出位置 / 用户原话引用。子 Agent 返回的自然语言理由不是依据——要它给出具体证据指针。

## 失败处置

| 症状 | 判断 | 动作 |
|------|------|------|
| `Unknown agent "spec-xxx"` | 角色未被发现 | 查 `.omp/agents/` 与 `~/.omp/agent/agents/`，核对 frontmatter 有 `name` 与 `description`（缺一即静默跳过） |
| 角色中途停住不动 | 多为 `tools` 白名单缺工具 | 检查该角色定义有无 `tools:` 行，有则删 |
| `Cannot spawn '...'. Allowed: ...` | 父 spawn 策略限制 | 主控自身的 spawns 策略问题，不是角色定义问题 |
| 角色报递归深度 | 该角色试图再 spawn | 角色应为 `spawns: ""`；它的活自己干，不再下派 |
| 同一角色连续失败两次 | 不是偶发 | 停止重试，附命令与原文错误交回用户 |

第三次重试没有意义——两次同样失败说明是配置问题，不是运气问题。

## 并发写冲突

同批多角色时，以下路径**只允许主控写**：

- `lead/team-context.md`（或 `.html`）的控制面区块
- `rk-manifest.js`

角色可直接追写账本的三个共享区（「任务进度」「问题闭环记录」「决策记录」），且**只改自己的行**。这是 `spec-start` 既有规则，编排模式下不变。

同批角色的产物目录必须互不重叠。writer 写 `writer/`，tester 写 `tester/`——天然隔离，不需要额外协调。
