# Spec 工作流规范

- 本项目采用 R&K Flow / Spec 驱动式开发
- 新功能使用 `/spec-start`，已有功能小迭代使用 `/spec-update`
- 实现前必须有已确认的 `writer/plan.md`
- 严格遵循 Spec，不添加计划外功能
- 每个关键节点等待用户确认，并记录在对应 Spec 文档中
- 收尾时使用 `exp-reflect` 沉淀经验，并由 `spec-end` 审查规范维护
- 角色（Who）与 Skill（How）严格分离
