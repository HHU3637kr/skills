# 文档规范

- 报告类产物（exploration-report / plan / test-plan / test-report / summary / debug / review / update / end-report）使用 HTML，遵循 `html-report` skill 的骨架与组件
- 账本 `lead/team-context.md` 与 `spec/context/` 记忆文件保持 Markdown
- Spec 目录命名：`YYYYMMDD-HHMM-任务描述`，任务描述使用中文
- 报告每次修改：修订号 +1、修订历史表追加一行、正文用 `<ins class="rk-ins">` / `<del class="rk-del">` 加 `data-rev` 标记，不静默改写原文
- 报告样式只改 `html-report/assets/rk-report.css`，报告内禁止写 `<style>` 或行内 `style=`
- 报告元信息双轨保留：`<head>` 逐字段写 `<meta name="rk:type|spec-dir|role|created|updated|revision|git-branch|base-branch|pr-url|tags">`，`.rk-meta` 镜像同样字段；关联字段用 `<link rel="rk-*">`，字段只增不删
- 报告关联双向：`<ul class="rk-links">` 记本报告引用（`data-rk-link`），`<ul class="rk-backlinks">` 记引用本报告（`data-rk-backlink`）；A 引用 B 时同时补 B 的反链，对侧未产出先标注「（待创建）」
- 修订「原因」列源于实质取舍时引用账本「决策记录」编号（如 `按 D-003`），决策过程正文留在账本不复制进报告
- Markdown 文档保留完整 YAML frontmatter
- README 是最高层叙事文档，CODEMAP 维护源码地图
- 长篇背景写入 `spec/context/knowledge/`，不要塞进 AGENTS.md
