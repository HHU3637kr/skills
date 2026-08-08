# Spec 驱动式开发 - Skills 体系

R&K Flow：完整的 Spec 驱动式开发 Skills 体系。开发流程拆分为 5 个阶段，由 7 个项目级专职角色分工协作，报告统一用 HTML 承载（固定样式 + 可追溯修订）。

## 技术栈

- **AI 运行时**: OMP（推荐）/ Claude Code / Codex / compatible coding agents
- **报告格式**: HTML（固定样式 + ins/del 修订标记 + 三视图）
- **账本与记忆**: Markdown（`lead/team-context.md`、`spec/context/`）
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
- 运行账本 `lead/team-context.md` 与 `spec/context/` 记忆保持 Markdown
- 命名规范：`YYYYMMDD-HHMM-任务描述`（任务描述必须中文）
- 报告每次修改递增修订号、追加修订历史行、用 `ins`/`del` + `data-rev` 标记
- 样式只改 `html-report/assets/rk-report.css`，不在报告内写 style

### 开发流程

- 新功能开发：`/spec-start` → 5 阶段流程
- 功能更新：`/spec-update`
- 问题修复：`/spec-debug`
- 经验检索：`/exp-search`
- 经验沉淀：`/exp-reflect`

### 记忆系统

- 自动层：Auto Memory（运行时自主管理）
- 显式层：`spec/context/experience/` + `spec/context/knowledge/`（Markdown）
- 索引文件始终加载，详情按需检索
