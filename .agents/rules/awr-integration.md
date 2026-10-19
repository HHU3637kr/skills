# AWR 运行时接入规范（v0.5.0 L0 官方正统生命周期规范）

## 一、定位与权威边界

AWR（Agent Work Runtime）是 R&K Flow 的底层运行状态机与上下文编译器，不替代 R&K Flow 的流程治理：
1. **唯一真相源（Source of Truth）**：工作台账（路径以 `.awr/project.toml` 的 `sources` 声明为准，脚手架项目为根目录 `work-ledger.yaml`）、`AGENTS.md`、`.agents/rules/`、各角色 HTML 报告与 Git 提交是唯一权威。
2. **状态机投影**：本地 `.awr/state.db` 仅作为机器索引、租约锁、事件日志与接续缓存，严禁作为业务权威，且必须被 `.gitignore` 忽略。
3. **流程裁决权归 R&K**：AWR 的任务状态（`ready`/`in_progress`/`completed`）是状态观测，不等于 R&K 门禁放行；`writer/plan.html` 未确认前，即使 AWR 状态为 ready 也绝对不得进入实现阶段。

---

## 二、日常工作看板导航（Daily Work Navigation）

在日常开发与开工巡视中，区分使用 `status` 与 `ready`：
- **`awr status`（行动视图 Action View）**：这是主控看板，正交区分 4 个队列：
  - `Continue`（进行中）：已认领且无阻塞的任务，直接接续持有它的 Session。
  - `Claimable`（可开工）：结构有效、前置依赖已满足、等待新 Session 认领的任务。
  - `Waiting`（等待中）：等待人工审批、外部依赖或前置执行结果的任务。
  - `Blocked`（阻塞中）：存在明确阻断、结构错误或凭据违规的任务。
- **`awr ready`**：专注查询处于候选状态、**尚未被任何 Agent 认领**的新开工任务。一旦任务被会话认领推进为进行中，会刻意从 `ready` 队列移出至 `status` 的 `Continue` 队列中，防止多 Agent 抢占。

---

## 三、AWR 核心会话生命周期与五步接力协议（Session & Claim Protocol）

为了防止多 Agent 并发踩踏，消除“需认领”与“孤儿会话”，各角色流转必须严格遵守官方 L0 契约：

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. 领包开工与认领租约 (Claim Ownership)                     │
│    awr session start --work <WORK> --claim ...              │
└──────────────────────────────┬──────────────────────────────┘
                               │ 获得 SESSION_ID 与独占租约
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 绑定会话提取上下文 (Session-Bound Context)               │
│    awr work prepare <WORK> --session <SESSION_ID> ...       │
└──────────────────────────────┬──────────────────────────────┘
                               │ 拿到 Context Hash 与聚焦资料
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 阶段盖章与留痕 (Session Checkpoint)                      │
│    awr session checkpoint --session <SESSION_ID> ...        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 角色交接原生接力 (Session Resume Relay)                  │
│    awr session resume --from-session <LAST_ID> ...          │
└──────────────────────────────┬──────────────────────────────┘
                               │ 租约与上下文无缝转移给下游角色
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4.5 完工核验与证据上链 (Work Complete)                      │
│    awr work complete --session <FINAL_ID> ...               │
└──────────────────────────────┬──────────────────────────────┘
                               │ 状态机注入 verification 块并置 completed
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 完工释放租约 (Session End & Release Claim)               │
│    awr session end --session <FINAL_ID> --outcome ended ...  │
└─────────────────────────────────────────────────────────────┘
```

### 1. 首个角色认领独占租约与推进开工（Session Start with `--claim` & `work progress`）
当首个角色（如 `spec-explorer` 或 `spec-start` TeamLead）进入新工作项时，必须显式带上 `--claim` 参数：
```bash
awr session start --work "<SPEC-ID>" --agent "<ROLE>" --provider omp --model default --claim --ttl-ms 3600000 --expected-revision "<REV>"
```
- **核心原理**：缺省 `--claim` 会导致 AWR 仅创建只读观察会话，看板显示“需认领”；带上 `--claim` 后，工作项被加独占运行时锁，其他人无法并发抢占。
- 获取返回的 `session.id`，登记入 `lead/team-context.md` 的「角色运行句柄」。

**重要：从 ready 到 in_progress 的必经状态迁移（消灭 InvalidTransition）**：
新创建的工作项在台账中初始状态为 `status: ready`。根据 AWR 状态机硬契约，处于 `ready` 状态的任务**严禁直接执行 `work complete`**（会直接报 `cannot Complete work with source state Ready` 退出码 1 阻断）。首发角色认领后开工时，必须显式通过 `awr work progress` 将其推进为 `in_progress`：
```bash
REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
awr work progress <SPEC-ID> --summary "<开工推进简述>" --next-action "<下一阶段动作>" --session <SESSION_ID> --reason "开工推进" --expected-revision "$REV"
```
*说明：`scripts/rk-awr-checkpoint.{sh,ps1}` 已内置上述 `ready` → `in_progress` 自动推进逻辑（开工时自动检测并执行，失败即 fail-closed 退出）。手动执行 `awr work progress` 仅适用于未通过检查点脚本开工的场景（例如直接使用 `awr session start --claim` 的裸流程），避免读者按旧文重复双推动作。*

### 2. 绑定会话的上下文准备（Session-Bound `work prepare`）
提取当前任务的聚焦上下文时，必须传 `--session` 参数：
```bash
awr work prepare <SPEC-ID> --session <SESSION-ID> --response-view summary
```
- **核心原理**：绑定会话后，AWR 将分发的 Context Hash 与当前 Agent 真实关联，后续盖章时能够证明“Agent 确实依据本版上下文进行设计与编码”。若提示超预算，追加 `--budget <N>`。

### 3. 会话检查点（Session Checkpoint）
阶段工作或测试完成后，必须向 AWR 提交检查点。优先调用封装辅助工具自动提取 Session ID、Context Hash 与 CAS 版本，杜绝手动输入占位符：
- **Linux / macOS / Git Bash 环境**：
  ```bash
  AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
  bash "$AWR_CP" --work <SPEC-ID> --agent <AGENT-ROLE> --digest "<本次完成简述>" --next-action "<下一动作>"
  ```
- **Windows 原生 PowerShell 环境**：
  ```powershell
  $AwrCp = if (Test-Path ".agents\skills\scripts\rk-awr-checkpoint.ps1") { ".agents\skills\scripts\rk-awr-checkpoint.ps1" } else { "scripts\rk-awr-checkpoint.ps1" }
  powershell -ExecutionPolicy Bypass -File $AwrCp -Work <SPEC-ID> -Agent <AGENT-ROLE> -Digest "<本次完成简述>" -NextAction "<下一动作>"
  ```
- 若测试发现 Bug 或阻断，追加 `--open-loop "<阻断简述>"`，使任务在看板中保持 Waiting/Blocked 态。
- 若 Bug 已修复并验证，在下一个检查点中省略该 open loop 即完成闭环。

### 4. 跨角色交接的会话接力（Session Resume Handoff）
当下游角色（如 writer 接 explorer、executor 接 writer、tester 接 executor）接手时，统一调用辅助脚本自动完成接力转交：
- **Linux / macOS / Git Bash 环境**：
  ```bash
  AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
  bash "$AWR_CP" --work <SPEC-ID> --agent <NEXT-ROLE> --digest "接力开工进入本阶段" --next-action "<下一动作>"
  ```
- **Windows 原生 PowerShell 环境**：
  ```powershell
  $AwrCp = if (Test-Path ".agents\skills\scripts\rk-awr-checkpoint.ps1") { ".agents\skills\scripts\rk-awr-checkpoint.ps1" } else { "scripts\rk-awr-checkpoint.ps1" }
  powershell -ExecutionPolicy Bypass -File $AwrCp -Work <SPEC-ID> -Agent <NEXT-ROLE> -Digest "接力开工进入本阶段" -NextAction "<下一动作>"
  ```
- **核心原理**：脚本底层会自动执行 `awr session resume --from-session <PREV-SESSION-ID> --agent <NEXT-ROLE> --provider omp --model default --claim ...` 完成租约转移（Claim Transfer），并将上游角色的上下文快照与未完成事项无损传递给下游角色。

### 4.5 完工机器核验与证据上链（Work Completion & Evidence Binding）
在角色测试通过、审查全绿、由 `spec-ender` 进入收尾时，统一执行 AWR 官方 0.5.0 机器核验闭环，杜绝仅靠手工修改台账导致的 `completion_not_checked` 审计缺口：
1. **自动派生机器核验报告（completion.report.v1）**：
   测试脚本必须在 `tester/artifacts/test-logs/<run-id>/` 自动派生符合 schema 的机器 JSON（不得直接将 HTML 报告传入 `prepare-completion`）：
   - `version`: 整数 `1`
   - `work_item`: 工作项内部键
   - `source_sha`: **40 位完整 Git 哈希**（执行 `git rev-parse HEAD` 获取；AWR 强约束禁止短 SHA）
   - `command`: 验证命令
   - `scope`: 字符串数组，如 `["<WORK-ID>"]`
   - `verified_at`: 毫秒级时间戳整数
   - `checks`: 用例清单，其中 `criteria` 必须与工作台账中 `acceptance` 的原文逐字完全一致（按 YAML 解析后的字符串值比较；AWR 回写台账后会做引号转义，原始文本子串匹配会出现假阴性）。
   - **路径硬约束（0.5.0 实测）**：该 JSON 必须位于项目根或 `.awr/project.toml` 的 `authorized_roots` 之内（脚手架默认 `authorized_roots=[]`，即只认项目内路径）。传项目外路径（如 `/tmp/...`）会被 `awr work prepare-completion --report` 以 `RuleViolation: registered file is outside project and authorized roots`（退出码 1）拒绝。标准落点：`tester/artifacts/test-logs/<run-id>/completion-report.json`。
2. **执行校验与证据注册**：
   ```bash
   # 验证报告结构真实性与台账标准映射（--report 必须传项目内路径；--source-sha 必须 40 位完整 SHA）
   PREP_OUT=$(awr work prepare-completion --report "tester/artifacts/test-logs/<run-id>/completion-report.json" --evidence-key "<WORK-ID>/evidence/<KEY>" --source-sha <40-CHAR-FULL-SHA> <WORK-ID> --json)

   # 注册证据元数据草稿。实测契约：prepare-completion --json 的顶层草稿键名是 evidence（不是任何别的名字），
   # 其中附带了 branch 与 work 两个只读回显字段，必须剔除后再传给 evidence add，否则报 unknown evidence input field。
   EVIDENCE_DRAFT=$(printf "%s" "$PREP_OUT" | python3 -c "import sys, json
d = json.load(sys.stdin).get('evidence', {})
d.pop('branch', None); d.pop('work', None)
print(json.dumps(d))")
   echo "$EVIDENCE_DRAFT" > "tester/artifacts/test-logs/<run-id>/evidence-draft.json"
   REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
   awr evidence add --input "tester/artifacts/test-logs/<run-id>/evidence-draft.json" --expected-revision "$REV"
   ```
   *可选旗标（0.5.0 实测存在、默认不传亦可）*：`--level locally_verified` 可显式声明证据级别；不传时 AWR 按报告内容自动定级。
   *路径边界（两个参数限制不同，勿混述）*：`--report` 只接受项目内路径；`evidence add --input` 与 `work complete --input` 对路径无项目内限制（`/tmp` 亦接受）——但并发环境下**一律使用项目内按 `<run-id>` 隔离的路径**，固定共享路径（如 `/tmp/complete-input.json`）会被并发进程互相覆盖，导致静默错绑（见 P1 并发缺陷实录）。
3. **由 spec-ender 执行官方三字段完工确认与租约释放（消灭终检点死锁）**：
   **会话释放与接力状态契约**：
   - **脚本探会话机制**：`rk-awr-checkpoint.sh --end` 运行时，优先复用当前调用方 agent 在该工作项上的活跃会话；若活跃会话属于其他 agent，才会尝试 `resume` 转移租约；若无活跃会话，才会回退 `session start` 新建会话。
   - **完工后边界状态（实测）**：`awr work complete` 执行后工作项立即变为终态 `completed`。此时脚本若尝试**跨角色接力**，AWR 返回 `InvalidTransition: resume requires known nonterminal work`；若脚本在无活跃会话下**新建会话**，AWR 返回 `DependencyBlocked: source status is completed`。
   - **推荐主路径**：`work complete` 成功后，优先由持有活跃会话的 `spec-ender` 在同一会话内直接关闭会话（现读最新 CAS 版本号并执行 `awr session end --session <ENDER_SESSION_ID> --outcome ended --expected-revision "$LATEST_REV"`）。
   - **同角色脚本释放兼容（实测 Case D 验证）**：若 `spec-ender` 此前已通过 `rk-awr-checkpoint.sh` 开工并持有该工作项的活跃会话，在 `work complete` 之后调用 `rk-awr-checkpoint.sh --end` 亦能成功复用该会话并释放租约（退出码 0，`doctor` 0 findings）。
   - **完工失败释放**：若 `work complete` 前遭遇校验失败或状态冲突，持有活跃会话的 `spec-ender` 调用 `rk-awr-checkpoint.sh --end` 或直接执行 `awr session end` 均为兜底释放租约的 sanctioned 路径。
   ```bash
   # 完工输入按 run-id 落项目内，严禁固定共享路径（并发多 Spec 会互相覆盖）
   mkdir -p "tester/artifacts/test-logs/<run-id>"
   cat > "tester/artifacts/test-logs/<run-id>/complete-input.json" <<EOF
   {
     "version": 1,
     "source_sha": "$(git rev-parse HEAD)",
     "acceptance": [
       {
         "criterion": "<台账 acceptance 第 1 项原文>",
         "evidence": ["<WORK-ID>/evidence/<KEY>"]
       }
     ]
   }
   EOF
   REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
   awr work complete --session <ENDER_SESSION_ID> --reason "验收通过且证据已全部绑定" --input "tester/artifacts/test-logs/<run-id>/complete-input.json" --expected-revision "$REV" <WORK-ID>
   
   # work complete 会自动重写 work-ledger.yaml 注入 verification 块并使 project_revision 递增
   # 必须现读最新的 CAS 版本号，直接调用 session end 释放租约：
   LATEST_REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
   awr session end --session <ENDER_SESSION_ID> --outcome ended --expected-revision "$LATEST_REV"
   ```
   随后执行 `awr doctor` 审计，即可达成 **0 findings** 的完全干净终态。
### 5. 交付收尾与显式释放租约（Session End）
当 Spec 经过测试、审查全绿，在 `spec-end` 收尾时，释放独占租约分两种路径：

1. **标准机器核验路径（强烈推荐）**：
   若已按上述「4.5 节」执行了 `awr work complete`，工作项在底层已转入终态 `completed`。此时推荐由持有该工作项活跃会话的 `spec-ender` 直接调用 `awr session end --session <ENDER_SESSION_ID> --outcome ended --expected-revision "$LATEST_REV"` 完成租约释放与 0 findings 干净终态。
   若采用脚本方式释放，必须确保当前调用方即为持有活跃会话的 `spec-ender`：同角色持会时脚本复用会话释放成功（实测退出码 0）；否则 AWR 状态机禁止在该工作项上执行**跨角色接力**（`resume` 报 `InvalidTransition: resume requires known nonterminal work`）或**无活跃会话的新建**（`session start` 报 `DependencyBlocked: source status is completed`）。

2. **无机器核验的降级/源声明路径**：
   若项目未配置 AWR 证据机器核验，仅通过手工修改 `work-ledger.yaml` 的 `status: completed`，且在修改前 `spec-ender` 已持有活跃会话，则可调用检查点脚本带 `--end` 显式关闭会话并释放锁：
   - **Linux / macOS / Git Bash 环境**：
     ```bash
     AWR_CP=.agents/skills/scripts/rk-awr-checkpoint.sh; [ -f "$AWR_CP" ] || AWR_CP=scripts/rk-awr-checkpoint.sh
     bash "$AWR_CP" --work <SPEC-ID> --agent spec-ender --digest "原位归档完成" --next-action "全部完结" --end
     ```
   - **Windows 原生 PowerShell 环境**：
     ```powershell
     $AwrCp = if (Test-Path ".agents\skills\scripts\rk-awr-checkpoint.ps1") { ".agents\skills\scripts\rk-awr-checkpoint.ps1" } else { "scripts\rk-awr-checkpoint.ps1" }
     powershell -ExecutionPolicy Bypass -File $AwrCp -Work <SPEC-ID> -Agent spec-ender -Digest "原位归档完成" -NextAction "全部完结" -End
     ```
   - **核心原理**：修改 `work-ledger.yaml` 为 `completed` 仅是源声明；脚本收尾时调用 `awr session end --session <SESSION_ID> --outcome ended --expected-revision <REV>` 才会解除数据库租约，彻底杜绝 `awr doctor` 报 `orphan_session` 孤儿会话。

## 四、配置与数据安全

1. 项目配置文件 `.awr/project.toml` 必须显式声明 primary ledger 与 supporting plans，禁止使用黑盒扫描。
2. `.awrignore` 与 `.gitignore` 必须排除运行态产物（`*.sqlite`、日志、二进制媒介、`.awr-backups/` 等）。
3. 在版本交付（`version-end`）时，统一触发 `mkdir -p .awr-backups && awr runtime backup --output ".awr-backups/<version>-$(date +%Y%m%d-%H%M%S)"` 进行本地数据库冷备。
