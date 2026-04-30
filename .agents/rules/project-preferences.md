# 项目偏好

- `AGENTS.md` 保持薄入口，只放项目身份、导入入口和目录路由
- 详细规则、项目偏好、前端风格等长期约束写入 `.agents/rules/`
- 新增规则优先更新已有 rules 文件，必要时再创建新文件
- `.agents/rules/` 每个文件保持 20 行以内，短、明确、可执行
- 一次性实现细节写入当前 Spec，不写入 AGENTS.md 或 rules
- 项目理解和设计理由写入 `spec/context/knowledge/`
