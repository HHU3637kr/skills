# Spec 驱动式开发 - Skills 体系

构建完整的 Skills 体系，通过 Obsidian 实现 Spec 驱动式开发方法论。v2.0 引入 Agent Teams 多角色协作架构，将开发流程拆分为 5 个阶段，由 6 个专职角色分工协作。

## 技术栈

- **AI Agent**: Claude Code (Anthropic)
- **文档系统**: Obsidian
- **版本控制**: Git
- **文档格式**: Obsidian Flavored Markdown
- **数据格式**: YAML (frontmatter), JSON (canvas)
- **类型**: 开发工作流框架 / Skills 工具库

## 项目规范

### 开发方法论

本项目采用 **Spec 驱动式开发**，所有功能开发遵循以下流程：
1. 先设计（plan.md），后实现
2. 严格遵循 Spec，不添加额外功能
3. 每个实现都可追溯到 Spec 文档
4. 完整的开发过程记录在 Obsidian 中

### 编码规范

@import .claude/rules/

### 文档规范

- 所有 Spec 文档使用 Obsidian Flavored Markdown
- 命名规范：`YYYYMMDD-HHMM-任务描述`（任务描述必须中文）
- 使用 `[[wikilink]]` 建立文档关联
- 每个文档包含完整的 YAML frontmatter

### 开发流程

- 新功能开发：`/spec-start` → 5 阶段流程
- 功能更新：`/spec-update`
- 问题修复：`/spec-debug`
- 经验检索：`/exp-search`
- 经验沉淀：`/exp-reflect`

### 记忆系统

- 自动层：Auto Memory（Claude 自主管理）
- 显式层：`spec/context/experience/` + `spec/context/knowledge/`
- 索引文件始终加载，详情按需检索
