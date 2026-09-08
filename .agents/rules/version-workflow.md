# Version 版本工作流规范

- 架构遵循「项目 → Version → Spec」三级流转：Spec 为研发原子闭环，Version 为交付管理实体
- 物理目录：`spec/versions/<version>/`（含 `version-context.md`、`plan.html`、`end-report.html`、`releases/` 与 `specs/`）
- 项目记忆 `spec/context/{knowledge,experience}/` 跨版本共享，不随版本割裂
- 需求性质四分平权：`feat`（业务功能）、`tech`（技术基建/AI底座）、`debt`（技术债治理）、`fix`（缺陷修复）
- Version 5 态流转：`规划中` → `执行中` → `验收中` → `已发布` → `已归档`（原位归档，不移动目录）
- 职责 Skill 矩阵：`version-start`（规划）/ `version-update`（范围治理）/ `version-release`（整体验收与发版）/ `version-end`（交付复盘与分支收尾）

## 旧项目兼容与升级策略（v2.9.0 迁移）

历史 `spec/01-xx` ~ `spec/06-已归档/` 目录保留作为只读历史记录；其 4 层 assets 路径与自身目录深度完全匹配，禁止改写。接入新版后直接运行 `/version-start` 建立新版本，后续新需求全部在版本内创建 Spec。
