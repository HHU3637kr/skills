---
disable-model-invocation: true
name: spec-init
description: >
  当项目首次接入 Spec 驱动开发 / R&K Flow，需要创建 AGENTS.md、.agents/rules/、
  .agents/skills/、spec/ 目录、记忆系统和 HTML 报告资产时使用。
  典型信号：用户说"初始化项目"/"搭建 Spec 环境"/"创建开发环境"，或项目根目录缺少 AGENTS.md / spec/。
  不要用于已有项目的单个 Spec 开发、功能更新或少量规范修改。
---

# Spec Init

## 核心原则

1. **幂等性**：所有操作先检查后创建，已存在则跳过，不覆盖已有内容
2. **完整性**：一次搭建完整的项目骨架，用户无需手动补充
3. **一次性**：整个项目生命周期只需执行一次，后续开发任务使用 `spec-start`

## 工作流程

### 步骤 1：检查项目状态

```bash
# 检查项目是否已初始化
ls AGENTS.md
ls spec/
ls .agents/

# 检查 Git 仓库状态
git rev-parse --is-inside-work-tree
git branch --show-current
git remote -v
```

如果 AGENTS.md 和 spec/ 都已存在，告知用户无需重复初始化，建议直接使用 `spec-start` 启动开发任务。
如果部分存在，只补充缺失部分。

Git 检查规则：
- 如果已经是 Git 仓库，记录当前分支和远程仓库；不要重新 `git init`
- 如果不是 Git 仓库，询问用户是否初始化 Git 仓库
- 用户确认后执行：

```bash
git init
git branch -M main
```

- 如果没有远程仓库，提示用户稍后添加 `origin`，但不阻塞 Spec 基础设施初始化
- 如果当前分支不是 `main`，只记录现状，不强制切换；后续 `spec-start` 会按 GitHub Flow 创建工作分支

### 步骤 2：询问项目基本信息

使用当前运行环境的确认/提问方式收集项目信息（用于生成 AGENTS.md）：

```text
请提供项目基本信息：
1. 项目名称
2. 项目简介（一句话描述）
3. 主要技术栈（如 Python/FastAPI、TypeScript/React 等）
4. 项目类型（如 Web 应用、CLI 工具、库等）
5. 长期项目偏好（可选，如产品体验、前端风格、协作习惯）
```


收集完基本信息后，必须询问当前运行环境（决定只生成哪一套运行时适配文件）：

```text
请确认你当前使用的 Agent 运行环境（用于生成对应的运行时适配，只创建当前环境所需文件）：
1. OMP（Oh My Pi）【推荐】 → 生成 .omp/agents/
2. Claude Code            → 生成 .claude/agents/
3. Codex                  → 生成 .codex/agents/

若用户没有明确偏好，推荐 OMP：R&K Flow 优先面向 OMP 设计并端到端验证，契合度最高。
```

记录用户选择为 `<runtime>`（`omp` / `claude` / `codex`）。后续步骤 4.3 只为 `<runtime>` 生成运行时适配文件，不创建其它环境的目录和文件。中立产物（`.agents/roles/`）始终创建，与运行环境无关。

**只建当前环境**：不要默认三套全建。`.agents/roles/`（中立角色定义）是权威源，必须创建；`.claude` / `.codex` / `.omp` 三套运行时适配只生成 `<runtime>` 对应的那一套。

### 步骤 3：创建 AGENTS.md

在项目根目录创建 `AGENTS.md`，这是项目的身份文件和路由入口。保持精简：只写项目身份、最高优先级工作方式、详细目录入口；具体规则和项目偏好写入 `.agents/rules/`。

```markdown
# {项目名称}

{项目简介}

## 项目身份

- **技术栈**: {主要技术栈}
- **类型**: {项目类型}

## 工作方式

本项目采用 R&K Flow / Spec 驱动式开发。新功能、更新、修复和收尾均通过 `.agents/skills/` 中的对应 Skill 执行。

## 详细规则入口

@import .agents/rules/
@import .agents/skills/

## 目录路由

- `.agents/rules/`：长期项目规则、项目偏好、前端风格、测试/安全/文档约束
- `.agents/skills/`：R&K Flow 工作流 Skill 与项目 SOP
- `.agents/roles/`：CLI 中立项目级角色定义
- `spec/context/knowledge/`：项目架构、模块理解、技术调研
- `spec/context/experience/`：困境-策略、踩坑经验、决策经验

> AGENTS.md 是入口清单，不承载长篇规范。每个 Spec 收尾时由 spec-end 审查是否需要维护 AGENTS.md 或 `.agents/rules/`。
```

**AGENTS.md 是模板**：根据用户提供的项目信息填充模板。如果用户有额外的长期项目规范或偏好，优先写入 `.agents/rules/`，只在需要修改入口、导入或项目身份摘要时更新 AGENTS.md。

### 步骤 4：创建 .agents/ 配置目录

#### 4.1 创建 rules/ 目录

```bash
mkdir -p ".agents/rules"
```

创建 `.agents/rules/coding-style.md`（编码风格模板，根据技术栈调整）：
```markdown
# 编码风格

- 变量命名：{根据语言选择 camelCase / snake_case}
- 函数/方法：简短、单一职责
- 文件长度：建议不超过 300 行
- 注释：关键逻辑必须注释，勿注释显而易见的代码
- 本文件只记录长期规则，临时实现细节不要写入
```

创建 `.agents/rules/project-preferences.md`（项目偏好模板，根据项目类型调整）：
```markdown
# 项目偏好

- 产品体验：{如内部工具优先信息密度；未知则写"遵循现有产品风格"}
- 前端风格：{如 UI 项目，记录布局、组件、图标、色彩、动效等长期偏好}
- 协作习惯：{如评审口径、发布节奏、命名偏好}
- 偏好必须长期有效、可复用；一次性需求写入当前 Spec
- 详细设计理由写入 `spec/context/knowledge/`
```

创建 `.agents/rules/spec-workflow.md`（Spec 工作流规范）：
```markdown
# Spec 工作流规范

- 实现前必须有已确认的 writer/plan.html
- 不添加 Spec 未定义的功能
- 每个关键节点等待用户确认
- 收尾时使用 exp-reflect 沉淀经验，并由 spec-end 审查是否维护 AGENTS.md / rules
- rules 只记录长期项目约束，避免写入一次性任务细节
```

创建 `.agents/rules/documentation.md`（文档规范）：
```markdown
# 文档规范

- 报告类产物使用 HTML（见 html-report skill）：exploration-report / plan / test-plan / test-report / summary / debug / review / update / end-report 一律 `.html`
- 账本与记忆保持 Markdown：`lead/team-context.md`、`spec/context/experience/*.md`、`spec/context/knowledge/*.md`
- 报告元信息双轨保留：`<head>` 的 `<meta name="rk:*">` / `<link rel="rk-*">` 机器可读，`.rk-meta` 人可读镜像
- 文档关联双向：`<ul class="rk-links">` 正向引用 + `<ul class="rk-backlinks">` 反向被引，新建关联时补齐对侧
- 报告修订必须递增修订号，并保留 `<ins class="rk-ins" data-rev="N">` / `<del class="rk-del" data-rev="N">` 标记，永不静默改写原文
- Spec 目录命名：`YYYYMMDD-HHMM-任务描述`，任务描述使用中文
- 报告样式只在 `html-report/assets/rk-report.css`，禁止在报告内写 `<style>` 或行内 `style=`
- 长篇背景写入 `spec/context/knowledge/`，不要塞进 AGENTS.md
```

创建 `.agents/rules/git-workflow.md`（GitHub Flow 规范）：
```markdown
# GitHub Flow 规范

- 每个新 Spec 从 main 创建短生命周期分支
- 同一活跃 Spec 的 update 复用原 Spec 分支
- 禁止直接在 main 上实现、测试或归档 Spec
- writer/plan.html / updater/update-xxx.html 的 `rk:git-branch` / `rk:base-branch` / `rk:pr-url` 必须记录分支与 PR
- 收尾时提交、推送当前分支并创建 PR
- PR 合并后同步 main 并删除本地/远程工作分支
```

**rules/ 每文件 ≤ 20 行**：`.agents/rules/` 中的文件每次会话都会加载，保持精简，避免占用 context window。新增长期规则时优先更新已有文件，必要时再创建新的规则文件。

#### 4.2 创建 skills/ 目录并安装 Skills

直接把 Skills 仓库克隆到 `.agents/skills/`：

```bash
git clone https://github.com/HHU3637kr/skills.git .agents/skills
```

再把当前 `<runtime>` 的 skills 目录软链接过去，三套运行时共享同一份副本（只建 `<runtime>` 对应的那一个）：

```bash
ln -s ../.agents/skills .omp/skills      # runtime == omp
ln -s ../.agents/skills .claude/skills   # runtime == claude
ln -s ../.agents/skills .codex/skills    # runtime == codex
```

Windows PowerShell（需管理员或开发者模式）：

```powershell
New-Item -ItemType SymbolicLink -Path .claude\skills -Target ..\.agents\skills
```

后续更新在 `.agents/skills/` 里 `git pull` 即可，软链接自动同步，不需要重装。

如果 `.agents/skills/` 已存在，不要覆盖：先确认是否已是本仓库的 clone，是则提示用户 `git pull` 更新，否则说明差异并等待用户决定。软链接目标已存在时同样先检查再处理。

#### 4.3 创建项目级角色定义与运行时 Agent 适配

**角色定义属于 spec-init**：`spec-start` 只负责加载和唤起角色实例，不再内联维护 7 个角色的 prompt 模板。7 个角色的唯一源定义见 [references/project-agent-roles.md](references/project-agent-roles.md)。

创建中立角色定义目录（始终创建），以及 **仅当前运行环境** 的适配目录：

```bash
# 中立角色定义：始终创建
mkdir -p ".agents/roles"

# 运行时适配目录：只创建 <runtime> 对应的一个
# <runtime> == omp    → mkdir -p ".omp/agents"
# <runtime> == claude → mkdir -p ".claude/agents"
# <runtime> == codex  → mkdir -p ".codex/agents"
```

按 [references/project-agent-roles.md](references/project-agent-roles.md) 创建 7 个中立角色定义：

```text
.agents/roles/spec-explorer.md
.agents/roles/spec-writer.md
.agents/roles/spec-tester.md
.agents/roles/spec-executor.md
.agents/roles/spec-debugger.md
.agents/roles/spec-reviewer.md
.agents/roles/spec-ender.md
```

角色定义必须包含：
- `role_id`
- `required_skill`
- `purpose`
- `activation`
- `inputs`
- `outputs`
- `handoff`
- `rules`

同时生成 **仅 `<runtime>` 对应** 的项目级运行时 Agent 适配文件（其它环境不创建）。

**若 `<runtime>` == claude**，生成 Claude Code 适配：

```text
.claude/agents/spec-explorer.md
.claude/agents/spec-writer.md
.claude/agents/spec-tester.md
.claude/agents/spec-executor.md
.claude/agents/spec-debugger.md
.claude/agents/spec-reviewer.md
.claude/agents/spec-ender.md
```

**若 `<runtime>` == codex**，生成 Codex 适配：

```text
.codex/agents/spec-explorer.toml
.codex/agents/spec-writer.toml
.codex/agents/spec-tester.toml
.codex/agents/spec-executor.toml
.codex/agents/spec-debugger.toml
.codex/agents/spec-reviewer.toml
.codex/agents/spec-ender.toml
```

并按需创建/合并 `.codex/config.toml`（不存在则创建最小配置，已存在则在不覆盖用户配置的前提下合并 `[agents]`）：

```toml
[agents]
max_threads = 7
max_depth = 1
```

**若 `<runtime>` == omp**，生成 OMP 适配。OMP 只发现 `.omp/agents/<name>.md`，明确跳过 `.claude/agents` 与 `.codex/agents`（其 frontmatter 不符合 OMP task-agent 契约）：

```text
.omp/agents/spec-explorer.md
.omp/agents/spec-writer.md
.omp/agents/spec-tester.md
.omp/agents/spec-executor.md
.omp/agents/spec-debugger.md
.omp/agents/spec-reviewer.md
.omp/agents/spec-ender.md
```

运行时适配规则（只应用 `<runtime>` 对应的条目，其它环境的规则跳过）：
- Claude Code 适配文件使用 Markdown + YAML frontmatter，正文要求角色先读取 `.agents/roles/<role-id>.md`
- Codex 适配文件使用 TOML，`developer_instructions` 要求角色先读取 `.agents/roles/<role-id>.md`
- Codex 适配文件的文件名继续使用 `<role-id>.toml`，但 `name` 字段使用 snake_case，例如 `spec_explorer`、`spec_tester`
- Codex CLI 的 `/agent` 只显示已启动的子 Agent 线程，不显示 `.codex/agents/` 下的 Agent 库；验证时应明确要求 Codex spawn 对应 `name`
- 不向 `~/.claude/agents/` 或 `~/.codex/agents/` 写入任何文件，除非用户明确要求安装为个人全局 Agent
- 已存在的角色或适配文件不覆盖；如需要更新，先说明差异并等待用户确认
- OMP 适配文件使用 Markdown + YAML frontmatter，但遵循 OMP task-agent 契约：frontmatter 必须含 `name` 与 `description`（缺一即被判为无效定义而跳过），正文整体作为该 Agent 的 system prompt，正文首行要求角色先读取 `.agents/roles/<role-id>.md` 获取权威职责
- OMP 可选 frontmatter 字段：`thinkingLevel`（off/minimal/low/medium/high/xhigh/max）、`tools`（CSV 或数组；**一旦写出即白名单**）、`spawns`（`*`/CSV）、`output`、`read-summarize: false`、`model`（可选，项目启用 per-role 时再写）
- 每个角色的推荐 OMP 字段见 [references/project-agent-roles.md](references/project-agent-roles.md)「OMP Per-Role Field Mapping」。硬性规则：
  1. **默认省略 `tools`**，继承 OMP 完整启用工具集（含 write/edit/bash/eval/irc/web_search/…），避免窄白名单导致中途卡死
  2. **禁止用只读/窄 tools 列表约束产品代码边界**；边界写在中立 `.agents/roles/*.md` rules
  3. 仅在项目明确要求限制工具时才写 `tools`，且必须覆盖完整工作集：`read, grep, glob, bash, lsp, write, edit, eval, web_search, ast_grep, ast_edit, debug, browser, ask, job, irc, search_tool_bm25`（`yield` 自动加）
  4. 工具名用 OMP 规范名：`grep`/`glob`（勿写 `search`/`find` 作为新定义规范名）；`thinkingLevel` 可选 `max`
  5. `model` 可选：项目启用多模型路由时再写；未配置则省略，继承 session / modelRoles
  6. spec-writer / spec-executor / spec-debugger 设 `read-summarize: false`；spec-tester 是 delegation 例外（必须真跑测试）；7 个角色一律 `spawns: ""` 保持深度 1
- TeamLead 是 OMP 主 Agent，通过 `task` 工具 spawn 这 7 个 `.omp/agents` 角色；角色间协作（如 spec-tester ↔ spec-debugger 修复循环）用 OMP 的 `irc` 子 Agent 通信，handoff 仍落盘到 `lead/team-context.md`
- OMP 16.4+ `task` wire schema（默认 batch）：`{ context, tasks: [{ name?, agent?, task }] }`。**不要**使用旧字段：top-level `agent`、`assignment`、`id`/`description`；UI label 由 `task` 文本自动生成
- 注意 OMP 的 `task.maxRecursionDepth`：TeamLead spawn 的角色处于深度 1，若某角色还需再 spawn 子 Agent，受递归深度限制，必要时在角色 frontmatter 显式声明 `spawns` 并确认未触顶
- `.agents/skills/` 本身就是 OMP `agents` provider 的原生发现路径（受 `enableAgentsProject` 控制），R&K 的 Skill 在 OMP 下开箱即用，无需额外 skill 适配
- 不向 `~/.omp/agent/agents/` 写入任何文件，除非用户明确要求安装为个人全局 Agent；已存在的 `.omp/agents/*.md` 不覆盖，需要更新先说明差异并等待用户确认
- 生成 `.omp/agents/<role-id>.md` 时，按 mapping 表写 frontmatter（thinkingLevel / spawns / 可选 model / 可选 read-summarize），**默认不要写 `tools` 行**

### 步骤 5：创建 Spec 目录结构

```bash
# 创建分类目录
mkdir -p "spec/01-产品规划"
mkdir -p "spec/02-技术设计"
mkdir -p "spec/03-能力交付"
mkdir -p "spec/04-系统改进"
mkdir -p "spec/05-验证工程"
mkdir -p "spec/06-已归档"

# 创建记忆系统目录
mkdir -p "spec/context/experience"
mkdir -p "spec/context/knowledge"
```

### 步骤 6：创建记忆索引文件

创建 `spec/context/experience/index.md`：
```markdown
---
title: 经验记忆索引
type: index
updated: {当前日期}
---

# 经验记忆索引

> 此文件由 exp-write 自动维护，记录所有经验记忆的摘要。
> 详情按需检索，避免占用过多 context window。

## 经验列表

（暂无经验记录）
```

创建 `spec/context/knowledge/index.md`：
```markdown
---
title: 知识记忆索引
type: index
updated: {当前日期}
---

# 知识记忆索引

> 此文件由 exp-write 自动维护，记录所有知识记忆的摘要。
> 详情按需检索，避免占用过多 context window。

## 知识列表

（暂无知识记录）
```

### 步骤 7：安装 HTML 报告资产

R&K Flow 的报告类产物统一用 HTML 承载，样式与脚本集中在**单一样式源** `html-report/assets/`，
改样式即全局改版；报告内禁止写 `<style>`、行内 `style=` 与外部 CDN。

先确认 Skills 是否已随 `.agents/skills/` 安装到位：

```bash
ls .agents/skills/html-report/assets/
```

如果存在（步骤 4.2 clone 后即自带），说明契约与资产已就位，报告直接引用该目录即可，本步骤到此结束。

如果项目希望资产独立于 skills 目录（例如报告需要脱离 skills 单独分发），把两个文件复制到项目根的 `html-report/assets/`：

```bash
mkdir -p "html-report/assets"
cp .agents/skills/html-report/assets/rk-report.css html-report/assets/
cp .agents/skills/html-report/assets/rk-report.js  html-report/assets/
```

报告从 `spec/<分类>/<spec目录>/<角色>/` 引用样式表的相对路径是 4 层：

```html
<link rel="stylesheet" href="../../../../html-report/assets/rk-report.css">
<script defer src="../../../../html-report/assets/rk-report.js"></script>
```

项目实际层级不同就相应调整，务必保证 `file://` 直接打开报告时样式生效。
格式边界：报告用 `.html`，`lead/team-context.md` 与 `spec/context/experience|knowledge/*.md` 保持 Markdown。

### 步骤 8：向用户确认初始化结果

展示初始化摘要，并询问下一步：

```text
项目 Spec 开发环境已初始化完成：
- AGENTS.md（项目身份 + 入口路由）
- .agents/rules/（长期规则 + 项目偏好）
- .agents/skills/（Skills 体系）
- .agents/roles/（CLI 中立项目级角色定义）
- 运行时适配（只创建了 `<runtime>` 对应的一套）：
  - omp    → .omp/agents/
  - claude → .claude/agents/
  - codex  → .codex/agents/
- spec/（Spec 目录 + 记忆系统）
- html-report/assets/（报告样式与脚本）

是否需要立即启动一个开发任务？
- 启动开发任务：调用 spec-start 加载项目级角色并开始 5 阶段流程
- 暂不启动：先熟悉项目结构，稍后手动调用 /spec-start
```

用户选择"启动开发任务"时，调用 `/spec-start`。

## 初始化后的目录结构

> 注意：`.claude/`、`.codex/`、`.omp/` 三套运行时适配只生成 `<runtime>` 对应的一套，下图同时列出仅为参考。

```
项目根目录/
├── AGENTS.md                        # 项目身份 + 入口清单 + 路由
├── .agents/
│   ├── rules/                       # 长期规则与项目偏好（每文件 ≤ 20 行）
│   │   ├── coding-style.md          # 编码风格
│   │   ├── project-preferences.md   # 项目偏好/产品体验/前端风格
│   │   ├── spec-workflow.md         # Spec 工作流规范
│   │   ├── documentation.md         # 文档规范
│   │   └── git-workflow.md          # GitHub Flow 规范
│   ├── roles/                       # CLI 中立项目级角色定义
│   │   ├── spec-explorer.md
│   │   ├── spec-writer.md
│   │   ├── spec-tester.md
│   │   ├── spec-executor.md
│   │   ├── spec-debugger.md
│   │   ├── spec-reviewer.md
│   │   └── spec-ender.md
│   └── skills/                      # Skills 体系（通过 CLI 或手动安装）
│       ├── spec-init/SKILL.md
│       ├── spec-start/SKILL.md
│       ├── spec-explore/SKILL.md
│       ├── spec-write/SKILL.md
│       ├── spec-test/SKILL.md
│       ├── spec-execute/SKILL.md
│       ├── spec-debug/SKILL.md
│       ├── spec-end/SKILL.md
│       ├── spec-update/SKILL.md
│       ├── spec-review/SKILL.md
│       ├── exp-search/SKILL.md
│       ├── exp-reflect/SKILL.md
│       ├── exp-write/SKILL.md
│       ├── intent-confirmation/SKILL.md
│       ├── git-work/SKILL.md
│       ├── skill-creator/SKILL.md
│       ├── find-skills/SKILL.md
│       ├── html-report/SKILL.md      # HTML 报告契约 + assets/（样式与脚本单一源）
│       └── html-report/assets/       # rk-report.css / rk-report.js
├── .claude/                          # 仅当 <runtime> == claude 生成
│   └── agents/                      # Claude Code 项目级 Agent 适配
│       ├── spec-explorer.md
│       ├── spec-writer.md
│       ├── spec-tester.md
│       ├── spec-executor.md
│       ├── spec-debugger.md
│       ├── spec-reviewer.md
│       └── spec-ender.md
├── .codex/                          # 仅当 <runtime> == codex 生成
│   ├── config.toml                  # Codex 项目级 Agent 配置（如需）
│   └── agents/                      # Codex 项目级 Agent 适配
│       ├── spec-explorer.toml
│       ├── spec-writer.toml
│       ├── spec-tester.toml
│       ├── spec-executor.toml
│       ├── spec-debugger.toml
│       ├── spec-reviewer.toml
│       └── spec-ender.toml
├── .omp/                            # 仅当 <runtime> == omp 生成（OMP 运行时适配）
│   └── agents/                      # OMP 项目级 Agent 适配（OMP 只发现 .omp/agents）
│       ├── spec-explorer.md
│       ├── spec-writer.md
│       ├── spec-tester.md
│       ├── spec-executor.md
│       ├── spec-debugger.md
│       ├── spec-reviewer.md
│       └── spec-ender.md
├── spec/
│   ├── 01-产品规划/
│   ├── 02-技术设计/
│   ├── 03-能力交付/
│   │   └── YYYYMMDD-HHMM-任务描述/    # 由 spec-start 创建
│   │       ├── lead/                  # TeamLead 运行上下文
│   │       │   └── team-context.md
│   │       ├── explorer/              # spec-explorer 产物
│   │       │   └── exploration-report.html
│   │       ├── writer/                # spec-writer 产物
│   │       │   └── plan.html
│   │       ├── tester/                # spec-tester 产物
│   │       │   ├── test-plan.html
│   │       │   ├── test-report.html
│   │       │   └── artifacts/
│   │       │       └── test-logs/
│   │       ├── executor/              # spec-executor 产物
│   │       │   └── summary.html
│   │       ├── debugger/              # spec-debugger 产物（按需）
│   │       │   ├── debug-001.html
│   │       │   └── debug-001-fix.html
│   │       ├── reviewer/              # spec-reviewer 产物（按需）
│   │       │   ├── review.html
│   │       │   └── update-001-review.html
│   │       ├── updater/               # spec-update 产物（按需）
│   │       │   ├── update-001.html
│   │       │   └── update-001-summary.html
│   │       └── ender/                 # spec-ender 产物
│   │           └── end-report.html
│   ├── 04-系统改进/
│   ├── 05-验证工程/
│   ├── 06-已归档/
│   └── context/
│       ├── experience/
│       │   └── index.md             # 经验索引
│       └── knowledge/
│           └── index.md             # 知识索引
└── html-report/                      # 报告资产（可选：独立于 .agents/skills/ 分发时）
    └── assets/
        ├── rk-report.css             # 唯一样式源
        └── rk-report.js              # 三视图切换脚本
```

## 后续动作

初始化完成后确认：
1. Git 仓库状态已检查；如用户确认，已完成 `git init` + `main` 分支初始化
2. AGENTS.md 已创建（项目身份 + 入口清单 + 路由）
3. .agents/rules/ 已创建（编码规范 + 项目偏好 + Spec 工作流 + 文档规范 + GitHub Flow）
4. .agents/skills/ 已安装或引导安装
5. .agents/roles/ 已创建（7 个项目级角色定义）
6. 运行时适配已按 `<runtime>` 只创建一套：
   - omp    → `.omp/agents/`（OMP 只发现 .omp/agents，跳过 .claude/.codex）
   - claude → `.claude/agents/`
   - codex  → `.codex/agents/`（+ `.codex/config.toml` 的 `[agents]`）
7. spec/ 目录结构已创建（6 个分类目录 + context/；单个 Spec 内由 spec-start 创建角色子目录）
8. 经验/知识索引文件已创建
9. HTML 报告资产已就位（`.agents/skills/html-report/assets/`，或项目根 `html-report/assets/`）
10. 已询问用户是否启动开发任务（spec-start）

### 常见陷阱
- 已有 AGENTS.md 时覆盖用户自定义内容（应先检查，已有则跳过或合并）
- 跳过步骤 2 的运行环境询问，默认三套适配全建（应先确认 `<runtime>`，只建对应一套）
- 已有 .agents/rules/ 时覆盖已有规范（应先检查）
- 已有 .agents/roles/ 或运行时适配文件时覆盖用户自定义角色（应先检查）
- 误以为 OMP 能读 `.claude/agents` 或 `.codex/agents`（实际被跳过，必须生成 `.omp/agents/*.md` 才能被 OMP 发现）
- 已有 `.omp/agents/*.md` 时直接覆盖（应先检查并说明差异）
- 给 OMP 角色写窄 `tools` 白名单（缺 bash/eval/write/edit 等），导致中途卡死或无法落盘 Spec 产物；**默认应省略 `tools`**
- 用只读 tools 列表代替角色 rules 来“保护”产品代码（错误做法；边界写在 `.agents/roles/*.md`）
- 在未启用 per-role 多模型时仍乱写 `model:`（可选字段；无规划则省略，继承 session 默认）
- 用旧 `task` schema（top-level `agent`、`assignment`、`id`）spawn 角色；OMP 16.4+ 用 `{ context, tasks: [{ name?, agent?, task }] }`
- 已有 spec/ 目录时重复创建（应先检查）
- 报告样式表相对路径层级算错，`file://` 打开报告时丢样式（从角色目录回项目根是 4 层）
- 在报告 HTML 里写 `<style>` 或行内 `style=`，绕开单一样式源导致改版失效
- 把 `lead/team-context.md` 或 `spec/context/experience|knowledge/*.md` 一并改成 HTML（必须保持 Markdown）
- 初始化后直接开始开发，跳过 spec-start 的需求对齐阶段
- AGENTS.md 中的技术栈信息与实际项目不符（应根据用户回答填充）
