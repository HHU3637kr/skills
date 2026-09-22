---
type: team-context
schema_version: 1
team_name: spec-20260922-1000-cli-neutral-scaffold
spec_dir: spec/versions/v2.11/specs/20260922-1000-fix-脚手架CLI中立化与根目录入口解耦
task_description: 脚手架 CLI 中立化：根目录 AGENTS.md、中立角色补全与消除冗余软链接
status: done
phase: ending
runtime: omp
mode: gated
execution: serial
git_branch: fix/spec-20260922-cli-neutral-scaffold
base_branch: master
pr_url: "https://github.com/HHU3637kr/skills/pull/10"
created_at: 2026-09-22T10:00:00+08:00
updated_at: 2026-09-22T10:45:00+08:00
---

# 团队运行账本

## 当前运行路径

| 步骤 | 阶段 | 负责角色 | 动作 | 状态 | 产物 | 门禁 | 更新时间 |
|------|------|----------|------|------|------|------|----------|
| 1 | intent | TeamLead | 需求对齐、版本变更登记与工作分支创建 | done | lead/team-context.md | gate-1 | 2026-09-22T10:00:00+08:00 |
| 2 | design | spec-writer | 编写 CLI 中立化设计方案报告 | done | writer/plan.html | gate-2 | 2026-09-22T10:15:00+08:00 |
| 3 | design | spec-tester | 编写测试方案与红绿断言策略 | done | tester/test-plan.html | gate-2 | 2026-09-22T10:20:00+08:00 |
| 4 | red-test | spec-tester | 编写红灯测试脚本并在当前旧脚本上复现失败 | done | tester/artifacts/test-logs/reproduce-red.sh | — | 2026-09-22T10:25:00+08:00 |
| 5 | implementation | spec-executor | 重构双端脚本并同步修正规范文档 | done | scripts/*, spec-init/SKILL.md, README.md, CODEMAP.md | — | 2026-09-22T10:35:00+08:00 |
| 6 | testing | spec-tester | 运行端到端测试转绿并输出回归报告 | done | tester/test-report.html | gate-3 | 2026-09-22T10:40:00+08:00 |
| 7 | ending | spec-ender | 经验反思沉淀、规范核对与收尾归档 | done | ender/end-report.html | gate-4 | 2026-09-22T10:45:00+08:00 |

## 任务进度

| 任务号 | 负责角色 | 任务 | 状态 | 产物 | 完成时间 | 更新者 |
|--------|----------|------|------|------|----------|--------|
| T-001 | TeamLead | 登记 v2.11 范围变更并切出工作分支 fix/spec-20260922-cli-neutral-scaffold | done | git branch | 2026-09-22T10:00:00+08:00 | TeamLead |
| T-002 | TeamLead | 初始化 Spec 目录结构与 lead/team-context.md 账本 | done | lead/team-context.md | 2026-09-22T10:02:00+08:00 | TeamLead |
| T-003 | spec-writer | 撰写方案设计报告 (writer/plan.html) | done | writer/plan.html | 2026-09-22T10:15:00+08:00 | spec-writer |
| T-004 | spec-tester | 撰写测试计划报告 (tester/test-plan.html) | done | tester/test-plan.html | 2026-09-22T10:20:00+08:00 | spec-tester |
| T-005 | spec-tester | 编写红灯测试先行脚本 (reproduce-red.sh) 并验证旧脚本红灯 | done | tester/artifacts/test-logs/ | 2026-09-22T10:25:00+08:00 | spec-tester |
| T-006 | spec-executor | 重构 scripts/init-ai-workflow.{sh,ps1} 实现根目录入口与中立化 | done | scripts/init-ai-workflow.{sh,ps1} | 2026-09-22T10:32:00+08:00 | spec-executor |
| T-007 | spec-executor | 修正 spec-init/SKILL.md 与 README.md / CODEMAP.md | done | spec-init/SKILL.md, README.md, CODEMAP.md | 2026-09-22T10:35:00+08:00 | spec-executor |
| T-008 | spec-executor | 输出执行总结报告 (executor/summary.html) | done | executor/summary.html | 2026-09-22T10:38:00+08:00 | spec-executor |
| T-009 | spec-tester | 运行端到端测试转绿并输出测试报告 (tester/test-report.html) | done | tester/test-report.html | 2026-09-22T10:40:00+08:00 | spec-tester |
| T-010 | spec-ender | 输出收尾报告 (ender/end-report.html) 并原位归档 | done | ender/end-report.html | 2026-09-22T10:45:00+08:00 | spec-ender |

## 问题闭环记录

| 问题号 | 分类 | 发现者 | 负责角色 | 问题 | 解决方案 | 关联产物 | 状态 | 更新者 |
|--------|------|--------|----------|------|----------|----------|------|--------|
| I-001 | bug | user | spec-executor | 初始化脚本硬编码将 AGENTS.md 写入 .omp/AGENTS.md，导致业务工程根目录缺失通用入口 | 脚本改为生成根目录 ./AGENTS.md，彻底删除 .omp/AGENTS.md 生成逻辑 | scripts/init-ai-workflow.{sh,ps1} | resolved | spec-executor |
| I-002 | bug | user | spec-executor | 初始化脚本缺少 .agents/roles/ 目录与 7 大中立角色的生成逻辑，导致业务项目缺少角色权威源 | 规范库自身补齐 .agents/roles/，脚本增加从规范库复制 7 个中立角色 Markdown | scripts/init-ai-workflow.{sh,ps1}, .agents/roles/ | resolved | spec-executor |
| I-003 | bug | user | spec-executor | 脚本硬编码生成 .omp/skills 软链接，对 OMP 属冗余且制造私有环境绑定；缺少多 runtime 参数化支持 | 移除 .omp/skills 软链接；脚本支持 --runtime none/omp/claude/codex 参数，按需生成对应适配 | scripts/init-ai-workflow.{sh,ps1} | resolved | spec-executor |
| I-004 | doc | TeamLead | spec-writer | spec-init/SKILL.md 与 README 描述与 CLI 中立架构不符 | 修正步骤 4.2/4.3 文档与架构图，强调根目录 AGENTS.md 与中立 roles | spec-init/SKILL.md, README.md, CODEMAP.md | resolved | spec-writer |
| I-005 | bug | user (审查) | spec-executor | create_symlink_or_junction 丢失普通物理目录防护，.claude/.codex 遭遇已有目录时静默嵌套或破坏数据 (P0-1) | 在通用建链函数内恢复 .bak-时间戳 自动备份与重解析点先删后建机制，对齐 ps1 New-JunctionSafely | scripts/init-ai-workflow.sh | resolved | spec-executor |
| I-006 | bug | user (审查) | spec-executor | Bash 脚本 --runtime 缺乏有效性校验，非法参数/大小写错误静默降级为 none (P1-1) | 增加 Fail-Closed 强校验 (合法值 none/omp/claude/codex，非法退出码 1) 并兼容 --runtime=val 等号语法 | scripts/init-ai-workflow.sh | resolved | spec-executor |
| I-007 | bug | user (审查) | spec-executor | 生产环境克隆 master 时因上游无 roles 导致回退至残缺模板，且缺少 rk-awr-checkpoint.* 引发 RC=127 (P0-1) | 脚本内置完整 7 角色兜底模板（含 inputs/rules 并修正 required_skill）并在目标工程固化 scripts/rk-awr-checkpoint.{sh,ps1} | scripts/init-ai-workflow.{sh,ps1} | resolved | spec-executor |
| I-008 | bug | user (审查) | spec-tester | reproduce-red.sh 存在 fail-open 漏洞，脚本静默失败时测试仍判绿 (P0-2) | 重构测试套件断言各步骤退出码 (RC=0/1) 并对 step 9-12 完整性与回退机制硬断言 | tester/artifacts/test-logs/reproduce-red.sh | resolved | spec-tester |
| I-009 | bug | user (审查) | spec-executor | create_symlink_or_junction 仅检查目录，普通文件会被强制 unlink 导致数据永久销毁 (P0-3) | 备份守卫扩展为 [ -e "$link_path" ] && [ ! -L "$link_path" ]，普通文件与目录一律自动 .bak 备份 | scripts/init-ai-workflow.sh | resolved | spec-executor |
| I-010 | doc | user (审查) | spec-writer | spec-end/SKILL.md:308 指令与原位归档冲突，写有已移动目录 (P0-4) | 修正 spec-end/SKILL.md 与 spec-ender.md，统一确立原位归档 (in-place) 原则 | spec-end/SKILL.md, .agents/roles/spec-ender.md | resolved | spec-writer |
| I-011 | bug | user (审查) | spec-executor | .gitignore 幂等追加采用全局行去重导致标题和空行被吞 (P0-5) | 采用整块存在性守卫 (! grep -qF ".awr/state.db") 代替全局整行 awk 去重，保留人可读排版结构 | scripts/init-ai-workflow.sh | resolved | spec-executor |
| I-012 | doc | user (审查) | TeamLead | .agents/rules/awr-integration.md 两处 session end 缺少必传 --expected-revision (P1-1) | 补齐 --expected-revision <REV> 完整参数 | .agents/rules/awr-integration.md | resolved | TeamLead |
| I-013 | bug | user (审查) | spec-executor | --skills-repo-url 缺少参数守卫导致吞掉下一选项并误路由至野目录 (P1-2) | 补齐 $# -lt 2 守卫，缺少参数值严正 exit 1 阻断 | scripts/init-ai-workflow.sh | resolved | spec-executor |
| I-014 | bug | user (审查) | spec-executor | .agents/skills 已存在但非 Git 仓库时被直接 rm -rf 物理抹除，克隆失败现场被破坏 (P0-1) | 增加存在性与非 Git 检查守卫，预置目录自动 .bak-时间戳 重命名备份后再克隆 | scripts/init-ai-workflow.{sh,ps1} | resolved | spec-executor |

## 决策记录

| 决策号 | 阶段 | 提出者 | 议题 | 候选项 | 结论 | 理由 | 拍板者 | 决策时间 | 依据 |
|--------|------|--------|------|--------|------|------|--------|----------|------|
| D-007 | design | user | 角色权威源 DRY 治理 | A: 删除 project-agent-roles.md 内联 YAML，确立 .agents/roles/ 为单一源; B: 继续保留两处定义 | A | 彻底消除两处角色定义逐字重复与长期漂移隐患，使参考文档聚焦于适配器渲染协议 | TeamLead | 2026-09-22T18:00:00+08:00 | 用户关于角色重复性的技术质询 |
| D-001 | intent | TeamLead | 需求归属与性质 | A: v2.11 / fix; B: 新开 v2.12 / tech | A | 消除初始化脚本架构缺陷，纳入当前在研版本 v2.11 范围变更闭环 | user | 2026-09-22T10:00:00+08:00 | 用户确认选项 |
| D-002 | intent | TeamLead | 修复范围边界 | A: 脚本 + 文档全量闭环; B: 仅文档 | A | 彻底消除脚本与文档脱节的根本原因 | user | 2026-09-22T10:00:00+08:00 | 用户确认选项 |
| D-003 | design | spec-writer | 默认运行时策略 | A: 默认 none (纯中立); B: 默认 omp | A | 业务项目首要装配中立规范资产，客户端适配按需可选 | spec-writer | 2026-09-22T10:02:00+08:00 | CLI 中立性原则 |
| D-004 | design | spec-writer | 软链接策略 | A: OMP 不建软链接，Claude/Codex 按需建; B: 全都不建 | A | OMP 原生支持 .agents/skills/，而 Claude/Codex 依赖各自隐藏目录下的 skills 索引 | spec-writer | 2026-09-22T10:02:00+08:00 | 实际客户端发现机制 |
| D-005 | debug | user (审查) | 物理目录建链防护策略 | A: 通用函数内重解析点安全处理与时间戳备份; B: 各调用点内联防护 | A | 彻底杜绝 .claude/.codex/skills 等路径因漏写内联防护引发的数据损坏风险，与 ps1 行为严格对称 | spec-executor | 2026-09-22T16:20:00+08:00 | 用户对抗式审查意见 P0-1 |
| D-006 | debug | user (审查) | 参数解析与校验模型 | A: Fail-Closed 强校验 + 支持等号语法; B: 宽松容错降级 | A | 消除静默配置错误，与 PowerShell ValidateSet 保持跨端语义一致 | spec-executor | 2026-09-22T16:22:00+08:00 | 用户对抗式审查意见 P1-1 |
| D-008 | debug | user (审查) | 非 Git 依赖源备份策略 | A: 检查是否存在并重命名 .bak-时间戳 备份; B: 强制 rm -rf | A | 彻底消除用户预置笔记或本地依赖被无告警抹除的不可逆风险，与 html-report 策略完全对称 | spec-executor | 2026-09-22T18:45:00+08:00 | 用户对抗式审查意见 P0-1 |

## 角色运行句柄

| 角色 | 运行句柄 / 会话 ID | 状态 | 备注 |
|------|-------------------|------|------|
| TeamLead | main-session | active | 主控协调与账本维护 |

## 产物注册表

| 产物路径 | 产物类型 | 负责角色 | 状态 | 用户确认 |
|----------|----------|----------|------|----------|
| writer/plan.html | plan | spec-writer | 已完成 | 已确认 |
| tester/test-plan.html | test-plan | spec-tester | 已完成 | 已确认 |
| executor/summary.html | summary | spec-executor | 已完成 | 已确认 |
| tester/test-report.html | test-report | spec-tester | 已完成 | 已确认 |
| ender/end-report.html | end-report | spec-ender | 已完成 | 已确认 |

## 门禁决策
| 门禁 | 确认对象 | 决策 | 判定方式 | 决策时间 | 备注 |
|------|----------|------|----------|----------|------|
| gate-1 | 任务对齐、性质判定与分支建立 | passed | user | 2026-09-22T10:00:00+08:00 | 用户明确确认归属 v2.11 / fix 并建立独立工作分支 |
| gate-2 | 方案评审与根因论证 | passed | self+evidence | 2026-09-22T10:20:00+08:00 | plan.html 与 test-plan 齐全，符合 CLI 中立设计 |
| gate-3 | 实现与测试结果确认 | passed | self+evidence | 2026-09-22T19:00:00+08:00 | 9 个组合场景 81 项自动化测试全绿通过，旧代码红灯已复现验证 |
| gate-4 | 收尾归档门禁 | passed | user | 2026-09-22T17:10:00+08:00 | 交付验收完成，P0/P1 全部缺陷消除，原位归档 |
## 修复循环预算

| 指标 | 预算值 | 已消耗 | 状态 |
|------|--------|--------|------|
| 最大修复轮数 (max_rounds) | 3 | 0 | 正常 (零轮修复，一次转绿) |
| 连续无进展轮数上限 (max_no_progress_rounds) | 2 | 0 | 正常 |

## 角色交接

| 来源角色 | 目标角色 | 交接内容 | 验证依据 |
|----------|----------|----------|----------|
| TeamLead | spec-writer | 需求已对齐，请开始撰写设计方案 writer/plan.html | 账本 gate-1 已通过 |
| spec-writer | spec-tester | 方案定稿，提交设计方案交接 | writer/plan.html 已产出 |
| spec-tester | spec-executor | 红灯已复现，进入编码实现 | 13/13 失败红灯日志 |
| spec-executor | spec-tester | 双端脚本重构完成，进入回归验证 | executor/summary.html |
| spec-tester | spec-ender | 9 场景 81 项绿灯回归通过，进入收尾归档 | tester/test-report.html |

## 开放问题与阻塞

本 Linux/WSL 环境已完成 Bash 脚本全场景（含 TC-05 预置真实目录防护与 TC-06 参数强校验）自动化测试与实测断言；PowerShell 脚本（init-ai-workflow.ps1 与 rk-awr-checkpoint.ps1）已完成代码级中立化重构与静态对齐，待合并后在 Windows 原生环境进行进一步实机复验。

## 下一步动作

全流程已按规范闭环交付，在目标分支提交并准备发起 PR。
