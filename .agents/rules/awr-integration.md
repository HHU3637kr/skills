# AWR 运行时接入规范

## 定位

AWR（Agent Work Runtime）是 R&K Flow 的运行时状态层，不替代 R&K Flow 的流程治理。R&K Flow 继续决定 Version/Spec 生命周期、角色、门禁、用户确认、测试结论、报告结论、Git 合并与发布；AWR 负责任务索引、依赖、认领、来源变化、检查点和当前任务上下文编译。

## 权威边界

- R&K Flow 正式产物与治理规则是权威：`AGENTS.md`、`.agents/rules/`、Version/Spec 报告、`writer/plan.html`、`lead/team-context.md`、测试报告与 Git 状态。
- AWR 的 SQLite 是索引和运行状态投影，不是事实源。
- AWR 不得自动批准门禁、改变 `mode`、替代用户确认、宣称测试通过、合并分支、改动默认分支或决定范围扩张。
- Markdown/YAML 仍由原文件保持权威；AWR 不得把上下文迁移成数据库唯一内容。

## 上下文接管

`spec/context/` 可以交给 AWR 做索引和按任务编译，但不能交出权威性。AWR 接管“上下文编译与分发”，R&K Flow 保留“上下文来源、规则解释和最终判断”。

每次角色开始或恢复前，TeamLead 必须优先获取 AWR 当前任务上下文，再按上下文中的来源指针读取原始文件。上下文至少包含：当前 Version、Spec、角色、阶段、已确认计划状态、依赖、未处理批注、阻塞、最近检查点、来源变化、下一步和不可触碰范围。

## 映射契约

- Version → AWR project goal / work group。
- Spec → AWR work，ID 使用稳定的 `SPEC-<slug>`。
- 角色阶段 → Spec work 下的 task，不创建重复项目。
- R&K `planned/exploring/.../archived` 映射到 AWR 状态时，保留 R&K 原状态；`ready` 只表示依赖满足，不表示门禁通过。
- HTML `rk-note` → AWR review/open-loop task；`data-note-id` 是稳定关联键。处理后必须回写标准 `rk-note is-done` Callout，并关闭对应 open loop。
- `checkpoint` 必须记录动作、验证命令/退出码/证据路径、未完成项、阻塞和下一步；checkpoint 不等于测试通过。

## 强制运行顺序

1. `awr ready`：找依赖满足的工作。
2. `awr context compile --work <SPEC-ID>`：取得聚焦上下文。
3. 读取上下文引用的 R&K 原始产物并检查门禁。
4. 按当前角色 Skill 执行，不超出已确认计划。
5. 在当前工作树完成新鲜验证。
6. 写 R&K 正式产物和账本。
7. 写 AWR checkpoint，包含可追证据。
8. 将下一角色/下一动作写回 AWR 与 R&K 账本。

## 并发与恢复

- 一个工作分支上的一个 Spec 任务只能有一个有效认领。
- 恢复前必须检查来源变化和 AWR 版本；拒绝过期写入，不覆盖更新状态。
- `swarm` 下 AWR 任务认领和状态写入由 TeamLead/主控协调；`rk-manifest.js` 与 `lead/team-context.md` 控制面仍由 TeamLead 独占维护。
- AWR 不可用时，从 R&K 落盘产物重建上下文；不得伪造 AWR 状态或证据。

## 接入配置

AWR 项目配置应放在项目根目录 `.awr/project.toml`；运行数据库、日志和临时状态不提交。配置必须排除旧历史归档和生成物，纳入当前 `spec/context/`、活跃 Version/Spec、规则和报告来源。首次初始化必须先 inspect 映射，再 accept；不可静默改写 R&K 文件。
