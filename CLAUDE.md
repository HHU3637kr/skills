# Spec 驱动式开发 - Skills 体系

R&K Flow：完整的 Spec 驱动式开发 Skills 体系。开发流程拆分为 5 个阶段，由 7 个项目级专职角色分工协作，报告统一用 HTML 承载（固定样式 + 可追溯修订）。

## 技术栈

- **AI 运行时**: OMP（推荐）/ Claude Code / Codex / compatible coding agents
- **报告格式**: HTML（固定样式 + ins/del 修订标记 + 三视图）
- **账本与记忆**: Markdown（`lead/team-context.md`、`spec/context/experience/`、`spec/context/knowledge/`）；项目本体为 `spec/context/ontology/ontology.json` + 自动渲染离线 HTML 视图（`index.html`）
- **版本控制**: Git / GitHub Flow
- **数据格式**: YAML (frontmatter), JSON
- **类型**: 开发工作流框架 / Skills 工具库

## 项目规范

### 开发方法论

本项目采用 **Spec 驱动式开发**，所有功能开发遵循以下流程：
1. 先设计（`writer/plan.html`），后实现
2. 严格遵循 Spec，不添加额外功能
3. 每个实现都可追溯到 Spec 文档
4. 完整的开发过程记录为 HTML 报告，修改可追溯

### 编码规范

@import .agents/rules/

### 文档规范

- 报告类产物使用 HTML，遵循 `html-report` skill 契约
- 运行账本 `lead/team-context.md` 或 `.html` 二者皆可（用 HTML 时豁免修订标记）；`spec/context/experience|knowledge/*.md` 保持 Markdown；`spec/context/ontology/` 为 JSON 真源 + 渲染 HTML 视图
- 命名规范：`YYYYMMDD-HHMM-任务描述`（任务描述必须中文）
- 报告每次修改递增修订号、追加修订历史行、用 `ins`/`del` + `data-rev` 标记
- 样式只改 `html-report/assets/rk-report.css`，不在报告内写 style

### 开发流程

- 新功能开发：`/spec-start` → 5 阶段流程
- 功能更新：`/spec-update`（不设独立收尾，审查通过后交由 `/spec-end` 统一收尾）
- 问题修复：`/spec-debug`（启用项目本体时按 OB-RCA 子图溯源与评估爆炸半径）
- 项目本体：`/project-ontology`（初始化/查询/增量同步 `spec/context/ontology/`）
- 经验检索：`/exp-search`
- 经验沉淀：`/exp-reflect`（统一于 `/spec-end` 收尾触发）

### 记忆系统

- 自动层：Auto Memory（运行时自主管理）
- 显式层：`spec/context/experience/` + `spec/context/knowledge/`（Markdown）
- 本体层：`spec/context/ontology/ontology.json` + `index.html`（按需启用，随 `spec-end` 增量维护）
- 索引文件始终加载，详情按需检索
