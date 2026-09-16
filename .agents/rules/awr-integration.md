# AWR 运行时接入规范（v0.4.0 标准）

## 定位

AWR（Agent Work Runtime）是 R&K Flow 的运行时状态层，不替代 R&K Flow 的流程治理。R&K Flow 继续决定 Version/Spec 生命周期、角色、门禁、用户确认、测试结论、报告结论、Git 合并与发布；AWR 负责任务索引、依赖、认领、来源变化、会话检查点和当前任务上下文编译。

## 权威边界

- R&K Flow 正式产物与治理规则是权威：`AGENTS.md`、`.agents/rules/`、Version/Spec 报告、`writer/plan.html`、`lead/team-context.md`、测试报告与 Git 状态。
- AWR 的 SQLite（`.awr/state.db`）是索引和运行状态投影，不是事实源。
- AWR 不得自动批准门禁、改变 `mode`、替代用户确认、宣称测试通过、合并分支、改动默认分支或决定范围扩张。
- Markdown/YAML 仍由原文件保持权威；AWR 不得把上下文迁移成数据库唯一内容。

## 上下文接管与准备

`spec/context/` 可以交给 AWR 做索引和按任务编译，但不能交出权威性。AWR 接管“上下文编译与分发”，R&K Flow 保留“上下文来源、规则解释和最终判断”。

在 AWR 0.4.0+ 体系下，每次角色开工或接续前，优先使用组合准备命令提取聚焦上下文：
```bash
awr work prepare <SPEC-ID> --response-view summary
```
若需要查看全量未折叠索引，使用 `awr context compile --work <SPEC-ID>`。从准备输出中提取目标、依赖、验收标准与最近变更；若输出提示 `BudgetExceeded`，按需追加 `--budget <N>`。

## 映射契约

- Version → AWR project goal / work group。
- Spec → AWR work，ID 使用稳定的 `SPEC-<slug>`。
- 角色阶段 → Spec work 下的 task，不创建重复项目。
- R&K `planned/exploring/.../archived` 映射到 AWR 状态时，保留 R&K 原状态；`ready` 只表示依赖满足，不表示门禁通过。
- HTML `rk-note` → AWR review/open-loop task；`data-note-id` 是稳定关联键。处理后必须回写标准 `rk-note is-done` Callout，并在下一轮 session checkpoint 中关闭对应 open loop。
- 会话检查点（Session Checkpoint）必须通过 `awr session checkpoint` 写入，记录 digest、证据路径、未完成项、阻塞和下一动作；checkpoint 不等于测试通过。

## 强制运行顺序（AWR 0.4.0 标准流）

1. **查待办与准备**：
   ```bash
   awr ready
   awr work prepare <SPEC-ID> --response-view summary
   ```
2. **打卡入场（会话认领）**：
   ```bash
   awr session start --work <SPEC-ID> --agent <AGENT-ROLE> --provider omp --model default --expected-revision <REV>
   ```
3. **查验门禁**：读取上下文引用的 R&K 原始产物并检查计划确认状态。
4. **严格执行**：按当前角色 Skill 执行，不超出已确认计划。
5. **新鲜验证**：在当前工作树完成真实测试与输出采集。
6. **落盘事实**：写 R&K 正式 HTML 报告和账本。
7. **会话盖章**：
   ```bash
   awr session checkpoint --session <SESSION-ID> --context-hash <HASH> --digest "<本次完成简述>" --next-action "<下一步动作>" --expected-revision <REV>
   ```
8. **更新台账**：将状态与下一步写回 `spec/work-ledger.yaml` 与 `lead/team-context.md`。

## 并发与恢复

- 一个工作分支上的一个 Spec 任务只能有一个有效会话认领。
- 恢复前必须检查来源变化和 AWR 版本；拒绝过期写入，不覆盖更新状态。
- `swarm` 下 AWR 任务认领和状态写入由 TeamLead/主控协调；`rk-manifest.js` 与 `lead/team-context.md` 控制面仍由 TeamLead 独占维护。
- AWR 不可用时，从 R&K 落盘产物重建上下文；不得伪造 AWR 状态或证据。

## 接入配置与数据安全

AWR 项目配置统一放在 `.awr/project.toml`；运行数据库、日志和临时状态不提交。配置必须排除旧历史归档和生成物，纳入当前 `spec/context/`、活跃 Version/Spec、规则和报告来源。首次初始化先使用 `--manifest` 明确 Primary 账本与 Supporting 计划文档，禁止无约束全盘暴力扫描；在版本归档时可通过 `awr runtime backup` 进行一致性冷备。
