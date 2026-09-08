---
disable-model-invocation: true
name: version-end
description: >
  当一个 Version 已经完成线上发布与业务交付确认，需要进入最终收尾与归档时使用。
  产出版本复盘报告（end-report.html）、经验回流项目级 context/、清理临时版本集成分支
  （release/<version>）与 worktree，并将最终归档文档合入主干（原位归档）。
  不要用于单个 Spec 的收尾（用 spec-end）。
---

# Version End

## 运行契约

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 目标版本号（如 `v1.6`）、已发布的 Tag（如 `v1.6.0`）、线上交付与业务验收确认结论、各 Spec 收尾复盘素材 |
| 权限 | 写 `spec/versions/<version>/end-report.html`；修改 `version-context.md` 状态为 `已归档`（原位归档）；向项目级 `spec/context/` 沉淀长期经验/知识；提交归档文档入主干；删除本地及远程 `release/<version>` 临时分支 |
| 验证 | 发布 Tag 已存在且已被线上业务确认验收；向 `dev` 的回流 PR/MR 已合并闭环；全版本所有 Spec 均已完工或延期；全量测试证据齐全 |
| 停止 | 产出复盘报告、原位归档更新完成，临时集成分支清理完成并通知用户/TeamLead |
| 升级 | 若发版后存在未解决的严重线上阻塞、或向 `dev` 的回流尚未合并完成，必须立即停止，不得强行归档 |

## 核心原则

1. **原位归档（In-Place Archiving）**：版本及其旗下的所有 Spec 一律在原物理目录保留，仅修改状态，绝对禁止移动或删除目录，确保历史链路完整。
2. **知识与经验项目级沉淀**：将本版本全周期沉淀出的高价值架构洞察、踩坑策略提炼写入项目级 `spec/context/experience/` 与 `knowledge/`，让跨版本复利持续生效。
3. **临时集成分支彻底清理**：版本正式归档后，临时提测分支 `release/<version>` 的使命结束，必须彻底删除；历史通过主干提交和发布 Tag 永久可溯。
4. **Git 与文档收尾强闭环**：归档文档直接提交入主干 `master`，避免遗留悬空状态。

## 工作流程

### 步骤 1：核查前置交付条件

检查 `spec/versions/<version>/version-context.md`：
1. 版本状态是否已处于 `已发布`。
2. 检查 Git Tag 是否已在主干正常打出（`git tag -l <tag>`）。
3. 检查提测期间的修复是否已全部合入 `dev`（`git log release/<version> ^dev` 输出为空，确认无遗漏提交）。
4. 业务方与用户是否已确认交付验收。

### 步骤 2：沉淀通用经验与知识

调用 `/exp-reflect`：
- 将本版本在架构设计、AI Agent 研发、依赖治理等方面的突破性经验写入 `spec/context/experience/`。
- 将成熟的技术选型与设计规范补充入 `spec/context/knowledge/`。

### 步骤 3：产出版本复盘报告 `end-report.html`

在 `spec/versions/<version>/end-report.html` 产出最终版本收尾报告。必须遵循 `html-report` 规范，声明 `rk:type="version-end-report"`、`rk:version="<version>"`、`rk:role="TeamLead"`、`rk:base-branch="master"`，引用 assets 必须为 3 层相对路径（`../../../html-report/assets/`），并使用 [html-report/templates/version-end-report-template.html](../../html-report/templates/version-end-report-template.html) 骨架：
- **版本达成结论**：最初目标 vs 最终交付对比。
- **Spec 交付总览**：按 `feat` / `tech` / `debt` / `fix` 分类列出全部实际交付项、工期与责任人。
- **未纳入/延期项去向**：明确列出哪些 Spec 移到了哪个后续版本（如延期到 `v1.7`）。
- **遗留风险与监控建议**：线上需持续观察的指标与报警策略。
- **双向关联**：链接到版本 `plan.html`、`releases/` 下的各发版报告、以及各 Spec 产物。

### 步骤 4：更新版本账本状态为「已归档」

修改 `spec/versions/<version>/version-context.md`：
- `status: 已归档`
- 记录归档时间、最终版本总结、经验沉淀条目索引。

### 步骤 5：提交归档文档至主干并回流 dev

由于代码已经在 `master` 上，本次归档报告与账本先提交合入 `master`，然后**强制回流 `dev`**（保证 `spec/context/{knowledge,experience}` 的最新沉淀跨版本在开发线共享）：

```bash
git checkout master
git pull origin master
git add "spec/versions/<version>" "spec/context"
git commit -m "docs(version): 完成 <version> 交付复盘与收尾归档"
git push origin master

# 强制将归档文档与沉淀的经验同步回流 dev
git checkout dev
git pull origin dev
git merge master --no-edit
git push origin dev
```
### 步骤 6：清理临时提测分支与 worktree（Git 终态清理）

删除该版本对应的临时提测集成分支：

```bash
# 删除本地临时分支
git branch -d release/<version>
# 删除远程临时分支
git push origin --delete release/<version>
```

若使用了针对该版本的专用 worktree，执行清理：
```bash
git worktree remove .worktrees/<version> --force
```

### 步骤 7：收尾通报

通知 TeamLead 与团队：`<version>` 版本已完整交付并完成原位归档，项目基线已更新，临时分支已清理。
