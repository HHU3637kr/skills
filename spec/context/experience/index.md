---
title: 经验记忆索引
type: index
updated: 2026-09-23
---

# 经验记忆索引

> 此文件记录跨版本共享的重大「困境-策略对」经验。
> 详情按需检索，避免占用过多 context window。

## 经验列表

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| EXP-002 | Windows 免提权 Junction 与跨端沙箱测试 | windows, junction, ntfs, powershell | 跨平台脚手架与环境初始化 | 采用 NTFS Junction 绕过提权限制，实测严格选在宿主机 NTFS 空间 | [exp-002-windows-junction-sandbox.md](exp-002-windows-junction-sandbox.md) |
| EXP-003 | 跨平台脚本自愈、防破坏备份与 UTF-8 读写防退化闭环 | cross-platform, powershell, encoding, awr, junction | 跨平台脚本健壮性与无损运行 | 读写双端显式 UTF-8 防 ANSI 退化，非链接目录重命名备份防硬删除 | [exp-003-cross-platform-script-hardening.md](exp-003-cross-platform-script-hardening.md) |
| EXP-005 | SKILL.md description 边界重叠导致 Skill 路由错判 | skill-routing, description, frontmatter, folded-scalar, 边界重叠 | 多 skill 共享入口信号的路由错判与 frontmatter 机械解析 | 边界成对写、窄口径方补用户向触发词、契约类 skill 声明只管格式；gold 基准 RED→GREEN 验收 | [exp-005-skill-routing-description-boundary.md](exp-005-skill-routing-description-boundary.md) |
| EXP-004 | 红蓝对抗式审查规程与深水区缺陷防伪验法则 | review, red-team, verification, awr, edge-cases | 架构接入与深水区工程审查 | 坚持红队立场优先挑刺，实测复现先行，严防伪兜底与假闭环 | [exp-004-adversarial-review-rubric.md](exp-004-adversarial-review-rubric.md) |
