# R&K Flow Skills

R&K Flow 是一套 Spec 驱动式开发 Skills 体系，报告用 HTML 承载，用 Agent Teams 多角色协作架构驱动开发流程。

## 项目身份

- **类型**: 开发工作流框架 / Skills 工具库
- **运行时**: OMP（推荐）/ Claude Code / Codex / compatible coding agents
- **报告格式**: HTML（固定样式 + 可追溯修订）
- **版本控制**: Git / dev + release 工作流（PR/MR 审查）

## 详细规则入口

@import .agents/rules/

## 目录路由

- `version-*`：项目版本生命周期管理 Skills（start / update / release / end）
- `spec-*`：R&K Flow 核心原子 Spec 研发生命周期 Skills
- `exp-*`：经验与知识记忆 Skills
- `html-report/`：报告 HTML 契约与共享样式资产
- `git-work/`：`dev + release` 集成与发布工作流（平台中立 PR/MR）
- `.agents/rules/`：长期项目规则（包含 version-workflow 等）、项目偏好和文档规范
- `spec/versions/`：版本管理目录（包含各 Version 规划、发版记录与各 Spec）
- `spec/context/experience/`：跨版本共享的显式经验记忆
- `spec/context/knowledge/`：跨版本共享的显式知识记忆
> AGENTS.md 是入口清单，不承载长篇规范。详细规则和项目偏好维护在 `.agents/rules/`。
