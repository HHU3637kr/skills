---
name: exp-search
description: 经验检索 Skill，根据关键词搜索项目历史记忆（经验记忆+知识记忆+程序记忆SOP+工具记忆+Auto Memory只读）。触发场景：开始复杂任务前、遇到问题时、需要查找历史解决方案、查找项目理解文档。
allowed-tools: Read, Glob, Grep
model: claude-haiku-4
---

# exp-search - 经验检索 Skill

## 概述

快速检索项目积累的多层记忆，在正确的时刻加载相关知识，避免重复踩坑。

**五层记忆检索范围**：
1. **经验记忆**：困境-策略对 → `spec/context/experience/exp-xxx-标题.md`
2. **知识记忆**：项目理解、技术调研 → `spec/context/knowledge/know-xxx-标题.md`
3. **程序记忆**：SOP 流程 → `.claude/skills/sop-xxx/SKILL.md`
4. **工具记忆**：Skill 后续动作 → 各 Skill 末尾「后续动作」章节
5. **Auto Memory（只读）**：跨会话记忆 → `~/.claude/projects/*/memory/*.md`

**职责边界**：exp-search **只读**所有记忆源，不写入任何文件。

## 触发场景

- 开始复杂任务前，检索相关经验
- 遇到问题时，搜索历史解决方案
- 查找项目理解文档（架构、数据流）
- 用户主动搜索：`/exp-search <关键词>`

## 核心文件

- **经验索引**：`spec/context/experience/index.md`（包含经验记忆索引）
- **知识索引**：`spec/context/knowledge/index.md`（包含知识记忆索引）
- **经验详情**：`spec/context/experience/exp-xxx-标题.md`
- **知识详情**：`spec/context/knowledge/know-xxx-标题.md`
- **SOP Skill**：`.claude/skills/sop-xxx-名称/SKILL.md`
- **Auto Memory**：`~/.claude/projects/*/memory/*.md`（只读）

---

## 执行流程

```
检索流程：
- [ ] 步骤 1：读取记忆索引（扩展）
      1. 读取 spec/context/experience/index.md（经验记忆）
      2. 读取 spec/context/knowledge/index.md（知识记忆）
      3. 【新增】读取 MEMORY.md（只读，作为补充搜索源）
      4. 【新增】扫描 ~/.claude/projects/*/memory/*.md 文件名列表（只读）

- [ ] 步骤 2：关键词匹配
      在索引中搜索匹配的条目
      匹配字段：标题、关键词、适用场景/触发场景

      匹配范围：
      - 经验记忆表（EXP-xxx）
      - 知识记忆表（KNOW-xxx）
      - 程序记忆表（sop-xxx）
      - 工具记忆表（Skill 后续动作）
      - 【新增】MEMORY.md 中的摘要行（只读）
      - 【新增】Auto Memory 目录下的 .md 文件内容（只读）

- [ ] 步骤 3：展示匹配结果
      按记忆类型分组展示

- [ ] 步骤 4：加载详情（可选）
      - 经验记忆 → 读取 spec/context/experience/exp-xxx-标题.md
      - 知识记忆 → 读取 spec/context/knowledge/know-xxx-标题.md
      - 程序记忆 → 提示用户调用对应 SOP Skill
      - 工具记忆 → 读取对应 Skill 的后续动作章节
```

---

## 搜索语法

| 用法 | 示例 | 说明 |
|------|------|------|
| 单关键词 | `/exp-search WebSocket` | 搜索包含 WebSocket 的经验 |
| 多关键词 | `/exp-search WebSocket 超时` | 搜索同时包含两个词的经验 |
| 场景描述 | `/exp-search 长时间任务连接断开` | 根据场景描述匹配 |

---

## 输出格式

### 匹配结果列表

```markdown
🔍 找到相关记忆：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 经验记忆（困境-策略对）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[EXP-003] AgentScope Hook 状态管理
关键词：AgentScope, Hook, 状态
一句话策略：通过 msg.id 检测新消息，重置状态保留进度

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 知识记忆（项目理解/技术调研）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[KNOW-001] TeachingAnalyzer 数据流与架构
关键词：数据流, 架构, MainAnalyzer
一句话概述：完整的视频分析流水线，从 ASR 到结果上传

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 程序记忆（SOP）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[sop-001] Docker 部署流程
触发场景：项目代码更新后需要重新部署到服务器
调用方式：直接使用该 Skill 的流程

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 工具记忆（Skill 后续动作）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[spec-executor] 后续动作
摘要：创建 summary.md → spec-reviewer 审查 → 归档

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Auto Memory（跨会话记忆·只读）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[MEMORY.md] 一句话摘要...
[debugging.md] 相关内容片段...

需要查看详情请告诉我记忆 ID 或 SOP 名称。
```

### 经验详情

```markdown
📖 经验详情：[EXP-001] WebSocket 连接超时

## 困境
评估任务执行时间较长（>60s），WebSocket 连接会超时断开，
导致前端无法收到任务完成通知。

## 策略
1. 增加 Nginx 的 proxy_read_timeout 到 300s
2. 前端添加心跳机制，每 30s 发送 ping
3. 后端支持断线重连，恢复任务状态

## 理由
三层防护确保连接稳定：
- Nginx 层：延长超时时间，覆盖大部分任务
- 应用层：心跳保活，防止空闲断开
- 容错层：即使断开也能恢复

## 相关文件
- frontend/src/utils/websocket.js
- frontend/nginx.conf
- backend/api/websocket.py
```

---

## 无匹配结果处理

```markdown
🔍 未找到与「xxx」相关的经验。

建议：
1. 尝试使用更通用的关键词
2. 检查关键词拼写
3. 检查 Auto Memory 是否有相关记录（MEMORY.md 在每次会话中自动加载）
4. 这可能是一个新问题，解决后可使用 `/exp-reflect` 沉淀经验
```

---

## 自动触发建议

在以下场景，Agent 应主动提示使用 exp-search：

| 场景 | 提示话术 |
|------|----------|
| 开始复杂任务 | "开始前，我先检索一下相关经验..." |
| 遇到报错 | "这个错误可能有历史解决方案，让我搜索一下..." |
| 用户描述问题 | "让我看看是否有类似问题的处理经验..." |

---

## 与其他 Skill 的协作

| 场景 | 协作 Skill |
|------|-----------|
| 搜索无结果，问题已解决 | → `/exp-reflect` 沉淀新经验或知识 |
| 需要添加新经验 | → `/exp-write type=experience` 写入经验 |
| 需要添加新知识 | → `/exp-write type=knowledge` 写入知识 |
