---
disable-model-invocation: true
name: version-release
description: >
  当一个 Version 旗下的所有规划 Spec 已开发完成，需要进入提测冻结（验收中），
  或全量集成测试通过后执行正式发版（产出 release-report、合入主干、打发布 Tag、回流 dev）时使用。
  不要用于单个 Spec 的发版收尾（用 spec-end）。
---

# Version Release

## 运行契约

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 目标版本号（如 `v1.6`）、发布版本 Tag（如 `v1.6.0`）、实际纳入的 Spec 清单与验证证据、部署环境与验证结果 |
| 权限 | 创建 `release/<version>` 提测分支；生成 `spec/versions/<version>/releases/<tag>/release-report.html`；创建面向主干的 PR/MR 并协助打 Tag；向 `dev` 创建回流 PR/MR |
| 验证 | 提测阶段：所有入版 Spec 均处于 `done` 状态；发版阶段：`release/<version>` 分支上的全量回归测试必须新鲜验证全部通过（零失败、零回归）；代码产物与部署验证完备 |
| 停止 | 提测冻结完成等待整体验收；或发版合并、打 Tag、回流 PR/MR 创建完成 |
| 升级 | 全量集成测试失败、发现破坏性回归、跨 Spec 组合业务流程阻断，或合入主干时发生冲突，必须立即停止并交由用户/TeamLead 决策 |

## 核心原则

1. **计划入版 vs 实际发布严格分离**：`plan.html` 记录最初想做什么，`releases/<tag>/release-report.html` 记录本发布真正打包了哪些 Spec、代码提交 SHA 与构建产物。
2. **提测冻结分支 `release/<version>` 承载**：从 `dev` 拉出提测分支，后续只允许合入针对该版本的缺陷修复（`fix/*`），主开发线 `dev` 可继续推进后续版本工作。
3. **主干合流与 Tag 不可变**：验收通过后通过 PR/MR 合入主干（`master`），在合并提交上打不可变 Git Tag（`vX.Y.Z`）。
4. **强制回流 `dev` 闭环**：发版后必须立即将 `release/<version>` 合回 `dev`，确保提测期间打的补丁绝不丢失。

## 工作流程

### 阶段一：提测冻结（进入「验收中」）

1. **核对前置条件**：检查 `version-context.md`，确认所有规划入版的 Spec 均已合并入 `dev` 且单项测试通过。未完成且确定延期的 Spec 先调用 `version-update` 移出。
2. **更新版本账本并创建提测集成分支**：
   - 将 `version-context.md` 状态改为 `验收中`，记录冻结时间与冻结提交 SHA。
   - 提交账本变更并拉出提测分支：
   ```bash
   git checkout dev
   git pull origin dev
   git add "spec/versions/<version>/version-context.md"
   git commit -m "docs(version): <version> 提测冻结，状态进入验收中"
   git checkout -b release/<version>
   git push -u origin release/<version>
   ```
3. **提测期间修复**：若测试发现跨模块集成缺陷，从 `release/<version>` 拉出 `fix/<slug>` 分支，修复并验证后提 PR/MR 合回 `release/<version>`。

---

### 阶段二：正式发版（进入「已发布」）

1. **执行全量回归测试**：在 `release/<version>` 分支上执行全量测试套件与端到端业务流验证，获取新鲜测试输出。
2. **生成发版交付报告 `release-report.html`**：
   创建 `spec/versions/<version>/releases/<tag>/release-report.html`，使用 [html-report/templates/release-report-template.html](../../html-report/templates/release-report-template.html) 骨架，遵循 `html-report` 规范（声明 `rk:version`、`rk:type="release-report"`、引用 `assets` 为 5 层相对路径 `../../../../../html-report/assets/`），必须包含：
   - 实际纳入的 Spec 列表（含各 Spec 路径与 PR/MR 链接）
   - 全量回归测试命令、退出码与证据日志位置
   - 候选提交 SHA 与构建镜像/产物摘要
   - 部署变更说明（配置项、数据迁移脚本等）
3. **提交发版报告（只提报告，不改账本）**：
   - 此时主干合并尚未发生，Tag 尚未打在 master 上，状态未最终闭环。
   - **仅**提交发版报告目录，不修改 `version-context.md`，避免账本提前进入终态：
   ```bash
   git add "spec/versions/<version>/releases/<tag>"
   git commit -m "docs(release): 产出 <tag> 发布报告与测试证据"
   git push origin release/<version>
   ```
4. **面向主干发起 PR/MR、合并并打 Tag**：
   - 发起从 `release/<version>` 到 `master` 的发布 PR/MR 并完成合并。
   - 切换到主干拉取最新提交，在主干合并提交上打发布 Tag 并推送：
     ```bash
     git checkout master
     git pull origin master
     git tag -a <tag> -m "release: <tag>"
     git push origin <tag>
     ```
5. **回流 `dev` 并在 `dev` 上执行唯一一次账本提交**：
   - 将 `release/<version>`（含发版报告与提测期 fix）通过 PR/MR 合回 `dev`（或在 `dev` 上 fast-forward / merge）。
   - 切换到 `dev` 分支，更新 `spec/versions/<version>/version-context.md`：
     - 状态改为 `已发布`
     - 登记发布 Tag（`<tag>`）、发布时间与主干 commit SHA
   - 在 `dev` 上做**唯一一次**账本提交并推送，彻底避免多次提交与账本回流冲突：
     ```bash
     git checkout dev
     git pull origin dev
     git add "spec/versions/<version>/version-context.md"
     git commit -m "docs(version): 更新 <version> 版本账本状态为已发布（<tag>）"
    git push origin dev
    ```
6. **向 AWR 提交版本发布检查点**：
   ```bash
   awr session checkpoint --session <SESSION-ID> --digest "version-release: 版本 <version> 已完成发布并打 Tag <tag>，状态更新为已发布" --next-action "version-end: 准备复盘收尾" --expected-revision <REV>
   ```
