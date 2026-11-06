---
disable-model-invocation: false
name: version-start
description: >
  当项目需要规划或启动一个新的产品版本里程碑（如 v1.6、v2.0），明确版本目标、需求范围、
  Spec 清单（含 feat/tech/debt/fix 四类平权）、依赖关系和整体验收条件时使用。
  不要用于单个 Spec 需求的开发启动（用 spec-start）或项目首次初始化（用 spec-init）。
---

# Version Start

## 运行契约

| 项 | 本 Skill 的约定 |
|----|----------------|
| 输入 | 目标版本号（如 `v1.6`）、版本里程碑目标、计划纳入的 Spec 清单及其属性（`feat` / `tech` / `debt` / `fix`）、预期排期与整体验收标准 |
| 权限 | 创建 `spec/versions/<version>/` 目录，写入 `version-context.md`、`plan.html`，创建 `specs/` 与 `releases/` 子目录；在 `dev` 分支提交初始版本规划 |
| 验证 | 物理目录存在；`version-context.md` 包含完整 Spec 规划表格与依赖声明；`plan.html` 符合 HTML 报告规范且元数据双轨齐全 |
| 停止 | 版本规划与账本创建完成并获得用户确认（或 autopilot 下新鲜验证通过） |
| 升级 | 版本目标与范围存在重大分歧、或依赖跨团队外部前置无法闭环时，停下交由用户决策 |

## 核心原则

1. **Version 是管理与交付实体**：每个版本对一组原子 Spec 负责，统筹交付范围与验收边界。
2. **四类需求平权**：在规划时平等对待 `feat`（业务功能）、`tech`（技术基建/AI底座）、`debt`（技术债治理）与 `fix`（缺陷修复），打破隐性技术债积压。
3. **计划入版 vs 实际发布双轨**：`plan.html` 记录规划意向，实际发布由 `version-release` 严格按交付证据记录。
4. **统一 Git 集成基线**：版本在 `dev` 分支上记录初始规划，后续所有该版本 Spec 均以 `dev` 为开发集成目标。

## 工作流程

### 步骤 1：明确版本目标与范围

与用户对齐以下核心要素：
- **版本号**：符合语义化版本命名，主线版本使用 `vX.Y`（如 `v1.6`），补丁版本使用 `vX.Y.Z`。
- **里程碑目标**：本版本完成后，用户/业务能获得什么新能力？解决了什么核心问题？
- **Spec 规划清单**：列出首批计划纳入的需求项，每项标注属性：
  - `feat`：业务/产品功能
  - `tech`：技术基建、AI 核心能力（Prompt、Trace、Eval、ASR、模型治理等）
  - `debt`：技术债治理、代码重构、性能优化
  - `fix`：已知问题修复
- **依赖与关键路径**：哪些 Spec 之间存在时序依赖，哪些依赖外部团队。
- **发布条件**：整体集成测试范围、性能基准、交付物清单。

### 步骤 2：创建版本物理目录

```bash
mkdir -p "spec/versions/<version>/specs"
mkdir -p "spec/versions/<version>/releases"
```

### 步骤 3：创建版本运行账本 `version-context.md`

在 `spec/versions/<version>/version-context.md` 写入版本管理账本：

```markdown
---
version: <version>
status: 规划中
created: YYYY-MM-DD
updated: YYYY-MM-DD
target_freeze_date: YYYY-MM-DD
target_release_date: YYYY-MM-DD
owner: TeamLead
base_branch: dev
---

# Version 运行账本：<version>

## 1. 版本目标
{简明扼要的版本核心目标}

## 2. 规划 Spec 清单（需求性质平权）

| Spec 标识 | 属性 | 标题 / 目标 | 负责人 | 状态 | 依赖前置 |
|---|---|---|---|---|---|
| （待启动） | feat | 用户分析报告中心 | - | 待排期 | - |
| （待启动） | tech | Agent Trace 链路追踪建设 | - | 待排期 | - |
| （待启动） | debt | 数据库连接池与慢查询优化 | - | 待排期 | - |
| （待启动） | fix | 偶发跨租户查询异常修复 | - | 待排期 | - |

## 3. 依赖与风险记录
- **外部依赖**：...
- **技术风险**：...

## 4. 范围变更记录（Scope Change Log）
| 日期 | 变更类型（新增/移出/延期） | Spec | 动因与依据 | 审批人 |
|---|---|---|---|---|
| YYYY-MM-DD | 初始规划 | 全部 | 版本立项初始范围 | user |
```

### 步骤 4：生成版本规划报告 `plan.html`

在 `spec/versions/<version>/plan.html` 生成版本规划大盘报告。必须使用 [html-report/templates/version-plan-template.html](../../html-report/templates/version-plan-template.html) 骨架，遵循 `html-report` 规范，声明 `rk:version="<version>"`、`rk:type="version-plan"`、`rk:role="TeamLead"`、`rk:base-branch="dev"`，引用 assets 必须为 3 层相对路径（`../../../html-report/assets/`），展示版本大盘。

**首屏与图**（机检强制最低图种）：结论块一句话说明版本核心价值与交付目标；紧随流程条（`rk-flow`：批次 / 里程碑时间轴）与指标卡（`rk-kpis`：Spec 数按 feat / tech / debt / fix 分类）。两者必须同时存在，放在结论块之后、第一个正文章节结束之前。

**图与表分工**：批次与里程碑用 flow；四类数量用 kpis；跨 Spec 依赖复杂时可加 `rk-fig` 依赖关系图。Spec 清单（四类平权）、依赖前置、范围变更记录、验收标准用表格，不用图替代明细。只有单个批次时保留一个真实节点并写明原因，不虚构里程碑；未排期 Spec 不计入「已排期」数字。

**开发者审核关注点**：四类属性是否真实反映范围而非平均分配；跨 Spec 依赖是否构成关键路径、外部依赖有无负责人；冻结/发布日期与批次是否可执行；每条 Spec 的目标是否可验收；范围变更是否记录动因与审批人。

**篇幅**：按内容选择图，不按字数凑图；单段聚焦一个判断，建议 150 字以内便于扫读。完整 Spec 清单与依赖明细用表格保留，不因篇幅删减。画法见 `html-report/references/figures.md`。

写完按 html-report「结构机检」一节的命令运行 `check-report.js`，退出码为 0 才算完成。

### 步骤 5：Git 提交初始版本规划

在当前工作分支（默认开发集成线 `dev`）提交初始版本规划文档：

```bash
git add "spec/versions/<version>"
git commit -m "docs(version): 初始化 <version> 版本规划与运行账本"
```

### 步骤 6：确认与交接

通知用户版本已建立，状态进入 `规划中`（或首个 Spec 启动时进入 `执行中`），后续可通过 `/spec-start` 在该版本下创建具体需求 Spec。
## AWR 运行时接入

Version 建立完成后，TeamLead 必须同步建立 AWR 运行视图：将 Version 目标映射为 AWR work group，将计划中的 Spec 映射为稳定的 `SPEC-<slug>` works，并登记 Spec 依赖。初始化前执行 `awr init`/`intake inspect`，确认映射后再接受；不得把 AWR SQLite 当作权威源。后续使用 `awr ready` 判断依赖是否满足，使用 `awr context compile --work <SPEC-ID>` 编译当前任务上下文。`ready` 不等于 R&K 门禁通过，Version 状态仍以 `version-context.md` 为准。详见 `.agents/rules/awr-integration.md`。
