# Version 版本工作流规范

- 架构遵循「项目 → Version → Spec」三级流转：Spec 为研发原子闭环，Version 为交付管理实体
- 物理目录：`spec/versions/<version>/`（含 `version-context.md`、`plan.html`、`end-report.html`、`releases/` 与 `specs/`）
- 项目记忆 `spec/context/{knowledge,experience}/` 跨版本共享，不随版本割裂
- 需求性质四分平权：`feat`（业务功能）、`tech`（技术基建/AI底座）、`debt`（技术债治理）、`fix`（缺陷修复）
- Version 5 态流转：`规划中` → `执行中` → `验收中` → `已发布` → `已归档`（原位归档，不移动目录）
- 职责 Skill 矩阵：`version-start`（规划）/ `version-update`（范围治理）/ `version-release`（整体验收与发版）/ `version-end`（交付复盘与分支收尾）
