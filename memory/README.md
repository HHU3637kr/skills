# Project Memory - 项目长时记忆元 Skill

## 概述

`project-memory` 是一个**元 Skill（Meta Skill）**，基于 [MUSE 框架](https://arxiv.org/html/2510.08002v1) 的"反思 → 结构化 → 记忆化"理念，用于管理 Agent 的长时记忆系统。

它不直接存储记忆，而是**引导 Agent 将经验结构化并写入正确的位置**，实现"技能自进化"。

## 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     MUSE 记忆架构 in Claude Code                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────┐ │
│  │   战略记忆       │   │   程序记忆       │   │  工具记忆   │ │
│  │ Strategic Memory │   │ Procedural Memory│   │ Tool Memory │ │
│  └────────┬─────────┘   └────────┬─────────┘   └──────┬──────┘ │
│           │                      │                    │        │
│           ▼                      ▼                    ▼        │
│     CLAUDE.md              独立的 Skill          Skill 末尾    │
│   （全量系统提示词）      （按需加载正文）      （后续动作指引）│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 三层记忆实现

| 记忆类型 | 存储位置 | 加载方式 | 内容 |
|---------|---------|---------|------|
| **战略记忆** | `CLAUDE.md` 的「战略记忆」章节 | 全量注入系统提示词 | `<困境, 策略>` 键值对 |
| **程序记忆** | `.claude/skills/sop-xxx/SKILL.md` | Skill description 作为索引，触发时加载正文 | SOP 流程步骤 |
| **工具记忆** | 每个 Skill 末尾的「后续动作」章节 | 随 Skill 一起加载 | 执行后的下一步动作指引 |

## 使用方法

### 手动触发

| 命令 | 说明 |
|------|------|
| `/memory` | 进入记忆管理模式，分析当前对话 |
| `/memory reflect` | 触发反思，提取可记录的经验 |
| `/memory strategic` | 查看 CLAUDE.md 中的战略记忆 |
| `/memory sop` | 列出所有 SOP Skill |
| `/memory add strategic` | 添加战略记忆到 CLAUDE.md |
| `/memory add sop` | 创建新的 SOP Skill |

### 自动触发

Agent 会在以下场景主动询问是否需要记录：

- **战略记忆**：解决了反复出现的困难问题、重大架构决策
- **程序记忆**：完成了多步骤复杂操作（>5 步）、发现重复操作模式
- **工具记忆**：发现某操作后总需要特定后续步骤

## 反思工作流

```
1. 回溯执行轨迹
   - 回顾本次对话中的所有操作
   - 识别关键决策点和转折点
   ↓
2. 分析可提取的经验
   - 是否有新的「困境-策略」对？→ 战略记忆
   - 是否形成了可复用的 SOP？→ 程序记忆
   - 是否发现了固定的后续步骤？→ 工具记忆
   ↓
3. 向用户确认
   - 展示提取的经验
   - 说明将写入的位置
   ↓
4. 执行写入
   - 战略记忆 → 编辑 CLAUDE.md
   - 程序记忆 → 创建新 Skill
   - 工具记忆 → 编辑相关 Skill 末尾
```

## 文件结构

```
.claude/skills/project-memory/
├── SKILL.md     # 元 Skill 主文件（完整指南）
└── README.md    # 本文件

# 战略记忆存储位置
CLAUDE.md        # 「战略记忆」章节

# 程序记忆存储位置（示例）
.claude/skills/sop-001-xxx/SKILL.md
.claude/skills/sop-002-xxx/SKILL.md
```

## 与 MUSE 框架的对应关系

| MUSE 概念 | Claude Code 实现 |
|----------|-----------------|
| Strategic Memory 全量加载到系统提示词 | 写入 CLAUDE.md（始终加载） |
| Procedural Memory 索引+正文分离 | Skill description 作为索引，Skill 正文作为 SOP |
| Tool Memory 动态嵌入工具返回 | Skill 末尾的「后续动作」章节 |
| Reflect Agent 反思智能体 | `/memory reflect` 触发反思流程 |

## 参考资料

- [MUSE: Learning on the Job - An Experience-Driven, Self-Evolving Agent](https://arxiv.org/html/2510.08002v1)
- [MUSE GitHub](https://github.com/KnowledgeXLab/MUSE)

## 许可

本 Skill 是 AI+专业评估系统项目的一部分。
