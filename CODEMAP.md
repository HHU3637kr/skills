# Codemap - R&K Flow

## 项目总览

本仓库是一套 **Claude Code Skills 体系**，为 Spec 驱动式开发提供完整的工作流定义。
不含可执行代码（除 obsidian-spec-confirm 插件外），全部由 Markdown Skill 定义文件组成。

**仓库地址**：`github.com/HHU3637kr/skills`
**分支**：`feature/v2.0-agent-teams`
**版本**：v2.0

---

## 文件结构

```
skills/                              # 仓库根目录
├── README.md                        # 总体文档（v2.0）
├── CODEMAP.md                       # 本文件
├── image.png                        # 架构图
├── .gitignore
│
├── spec-init/                       # 🏗️ 项目初始化（一次性）
│   └── SKILL.md                     #    创建完整项目骨架
│
├── spec-start/                      # 🚀 启动 Agent Teams（每次任务）
│   └── SKILL.md                     #    创建 6 个专职角色
│
├── spec-explore/                    # 🔍 前置探索
│   └── SKILL.md                     #    信息收集 → exploration-report.md
│
├── spec-write/                      # 📝 设计方案
│   ├── SKILL.md                     #    撰写 plan.md
│   └── references/
│       └── plan-template.md         #    plan.md 模板
│
├── spec-test/                       # 🧪 测试
│   └── SKILL.md                     #    test-plan.md + test-report.md
│
├── spec-execute/                    # ⚙️ 实现
│   ├── SKILL.md                     #    按 plan.md 编码 → summary.md
│   └── references/
│       └── summary-template.md      #    summary.md 模板
│
├── spec-debug/                      # 🐛 调试
│   ├── SKILL.md                     #    诊断 → debug-xxx.md
│   └── references/
│       └── debug-template.md        #    debug 文档模板
│
├── spec-end/                        # 🏁 收尾
│   └── SKILL.md                     #    经验沉淀 + 归档 + git
│
├── spec-update/                     # 🔄 功能更新
│   ├── SKILL.md                     #    update-xxx.md（不归档）
│   └── references/
│       ├── update-plan-template.md  #    更新方案模板
│       └── update-summary-template.md
│
├── spec-review/                     # 📋 审查
│   ├── SKILL.md                     #    验证实现 → review.md
│   └── references/
│       └── review-template.md       #    审查报告模板
│
├── exp-search/                      # 🔎 记忆检索
│   └── SKILL.md                     #    五层记忆搜索
│
├── exp-reflect/                     # 💡 记忆反思
│   └── SKILL.md                     #    对话分析 → 类型分流
│
├── exp-write/                       # ✍️ 记忆写入
│   └── SKILL.md                     #    写入 experience/ 或 knowledge/
│
├── intent-confirmation/             # ⚠️ 意图确认
│   └── SKILL.md                     #    前置确认机制
│
├── git-work/                        # 📦 Git 工作流
│   ├── SKILL.md                     #    标准 Git 操作
│   ├── examples.md                  #    示例
│   └── reference.md                 #    命令参考
│
├── find-skills/                     # 🛒 Skill 发现
│   ├── SKILL.md                     #    搜索安装开源 Skill
│   └── _meta.json                   #    元数据
│
├── skill-creator/                   # 🔧 Skill 创建
│   ├── SKILL.md                     #    创建新 Skill 指南
│   ├── LICENSE.txt
│   ├── references/
│   │   ├── output-patterns.md       #    输出模式
│   │   └── workflows.md             #    工作流模式
│   └── scripts/
│       ├── init_skill.py            #    初始化脚本
│       ├── package_skill.py         #    打包脚本
│       └── quick_validate.py        #    验证脚本
│
├── obsidian-markdown/               # 📄 Obsidian Markdown
│   └── SKILL.md                     #    OFM 语法指南
│
├── obsidian-bases/                  # 📊 Obsidian Bases
│   └── SKILL.md                     #    .base 文件语法
│
├── obsidian-plugin-dev/             # 🔌 Obsidian 插件开发
│   └── SKILL.md                     #    插件开发指南
│
├── json-canvas/                     # 🖼️ JSON Canvas
│   └── SKILL.md                     #    .canvas 文件语法
│
├── agent-browser/                   # 🌐 浏览器自动化
│   ├── SKILL.md                     #    无头浏览器控制
│   ├── references/
│   │   ├── commands.md              #    命令参考
│   │   ├── troubleshooting.md       #    故障排除
│   │   └── workflows.md             #    工作流
│   └── scripts/
│       └── check_environment.py     #    环境检查脚本
│
└── obsidian-spec-confirm/           # ⚠️ [已废弃] MCP 确认插件
    ├── README.md                    #    废弃说明
    ├── main.ts                      #    Obsidian 插件入口
    ├── manifest.json
    ├── package.json
    ├── esbuild.config.mjs
    ├── tsconfig.json
    ├── styles.css
    └── src/
        ├── mcp-server.ts            #    MCP 服务端
        ├── mcp-tools.ts             #    MCP 工具定义
        ├── sidebar.ts               #    侧边栏 UI
        ├── status-manager.ts        #    状态管理
        ├── ui-components.ts         #    UI 组件
        └── utils.ts                 #    工具函数
```

---

## Skill 分类与依赖关系

### 一、Spec 核心工作流（按执行顺序）

```
spec-init ──→ spec-start ──→ [5 阶段流程] ──→ spec-end
(一次性)      (每次任务)                        (每次任务)

5 阶段流程：
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  阶段一    阶段二              阶段三    阶段四    阶段五     │
│  intent    spec-explore        spec      spec     spec      │
│  confirm   → spec-write        execute   test     end       │
│            ↔ spec-test                   ↔ spec             │
│                                            debug            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

独立流程：
  spec-update ──→ (不归档，不走 5 阶段)
  spec-review ──→ (可选，任意时刻调用)
```

### 二、Skill 间调用关系图

```
                    ┌──────────────┐
                    │  spec-init   │ ─── 引导安装 ──→ find-skills
                    │ (项目初始化)  │
                    └──────┬───────┘
                           │ 完成后可调用
                           ▼
                    ┌──────────────┐
                    │  spec-start  │ ─── 调用 ──→ intent-confirmation
                    │ (启动团队)    │
                    └──────┬───────┘
                           │ 通知
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │spec-explore │ │ spec-write  │ │  spec-test  │
    │  调用:       │ │  协作:       │ │  协作:       │
    │ exp-search  │ │ spec-test   │ │ spec-write  │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │    通知        │    通知        │ (阶段四) 发现 bug
           ▼               ▼               ▼
    ┌─────────────┐                 ┌─────────────┐
    │spec-execute │                 │ spec-debug  │
    │             │                 │  通知:       │
    │             │                 │ spec-test   │
    └──────┬──────┘                 └─────────────┘
           │
           │ 通知
           ▼
    ┌─────────────┐
    │  spec-end   │ ─── 调用 ──→ exp-reflect ──→ exp-write
    │  调用:       │ ─── 调用 ──→ git-work
    └─────────────┘
```

### 三、详细依赖矩阵

| Skill | 调用/依赖 | 被调用/被依赖 |
|-------|----------|-------------|
| **spec-init** | `find-skills`, `spec-start` | — |
| **spec-start** | `intent-confirmation` | `spec-init` |
| **spec-explore** | `exp-search` | `spec-start`(TeamLead) |
| **spec-write** | `obsidian-markdown` | `spec-explore`, `spec-test`(协作) |
| **spec-test** | `spec-debug`(通知) | `spec-write`(协作), `spec-debug`(验证) |
| **spec-execute** | `exp-search` | `spec-start`(TeamLead) |
| **spec-debug** | `spec-test`(通知) | `spec-test`(通知) |
| **spec-end** | `exp-reflect`, `git-work` | `spec-start`(TeamLead) |
| **spec-update** | `obsidian-markdown` | — (独立调用) |
| **spec-review** | `obsidian-markdown` | — (独立调用) |
| **exp-search** | — | `spec-explore`, `spec-execute`, `spec-end` |
| **exp-reflect** | `exp-write` | `spec-end` |
| **exp-write** | — | `exp-reflect` |
| **intent-confirmation** | — | `spec-start` |
| **git-work** | — | `spec-end` |
| **find-skills** | — | `spec-init` |
| **skill-creator** | — | — (独立调用) |
| **obsidian-markdown** | — | 所有生成 .md 的 Skill |
| **obsidian-bases** | — | — (独立调用) |
| **obsidian-plugin-dev** | — | — (独立调用) |
| **json-canvas** | — | — (独立调用) |
| **agent-browser** | — | — (独立调用) |

---

## 数据流

### 文档产出流

```
spec-explore   → exploration-report.md
spec-write     → plan.md
spec-test      → test-plan.md (阶段二)
spec-test      → test-report.md (阶段四)
spec-execute   → summary.md
spec-debug     → debug-xxx.md, debug-xxx-fix.md
spec-review    → review.md
spec-update    → update-xxx.md, update-xxx-summary.md
exp-write      → exp-xxx-标题.md / know-xxx-标题.md
spec-init      → AGENTS.md, .agents/rules/*.md
```

### 记忆数据流

```
开发前：
  exp-search ──→ 搜索 5 层记忆 ──→ 返回相关经验

开发后：
  spec-end ──→ exp-reflect ──→ 分析对话
                  │
                  ├─ 重大经验 → exp-write → spec/context/experience/
                  ├─ 项目理解 → exp-write → spec/context/knowledge/
                  ├─ 可复用SOP → skill-creator → 新 Skill
                  └─ 轻量经验 → Auto Memory（Claude 自动处理）
```

### 门禁数据流

```
阶段一完成 → TeamLead → AskUserQuestion → 用户确认 → 阶段二
阶段二完成 → TeamLead → AskUserQuestion → 用户确认 → 阶段三
阶段三完成 → TeamLead → AskUserQuestion → 用户确认 → 阶段四
阶段四完成 → TeamLead → AskUserQuestion → 用户确认 → 阶段五
阶段五      → spec-ender → AskUserQuestion → 用户确认归档
```

---

## 角色映射

| 角色（Who） | Skill（How） | 阶段 |
|------------|-------------|------|
| TeamLead（当前 Agent） | `spec-start`, `intent-confirmation` | 全程 |
| spec-explorer | `spec-explore` | 阶段二前置 |
| spec-writer | `spec-write` | 阶段二 |
| spec-tester | `spec-test` | 阶段二 + 四 |
| spec-executor | `spec-execute` | 阶段三 |
| spec-debugger | `spec-debug` | 阶段三/四 |
| spec-ender | `spec-end` | 阶段五 |

---

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| Skill 定义 | Markdown (SKILL.md) | YAML frontmatter + 流程描述 |
| 文档格式 | Obsidian Flavored Markdown | wikilinks, callouts, frontmatter |
| 数据库视图 | Obsidian Bases (.base) | 动态索引、过滤 |
| 可视化 | JSON Canvas (.canvas) | 关系图、架构图 |
| 版本控制 | Git | git-work 管理 |
| AI Agent | Claude Code (Anthropic) | TeamCreate, SendMessage API |
| 废弃组件 | obsidian-spec-confirm (TypeScript) | MCP 插件，已废弃 |

---

## 注意事项

- `obsidian-spec-confirm/` 是唯一包含可执行代码的目录（TypeScript Obsidian 插件），但已**废弃**
- `skill-creator/scripts/` 包含 Python 辅助脚本（init/package/validate），非核心流程
- `agent-browser/scripts/` 包含环境检查脚本，独立于 Spec 工作流
- `nul` 是 Windows 系统产生的垃圾文件，应加入 .gitignore
