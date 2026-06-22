# Runtime Hook Examples

本文件给 `spec-init` 使用：当项目需要为 `lead/team-context.md` 自动记账时，参考这里生成运行时 Hook 适配。中立协议仍以 `team-context-hook-contract.md` 为准；本文件只提供 Claude Code 和 Codex 的项目级配置样例。

> 参考来源：
> - Claude Code Hooks: https://code.claude.com/docs/en/hooks
> - Codex Hooks: https://developers.openai.com/codex/hooks

## 使用原则

- 优先创建项目级配置，不写用户全局配置：
  - Claude Code: `.claude/settings.json`
  - Codex: `.codex/hooks.json` 或 `.codex/config.toml`
- 不同时在同一个 Codex layer 使用 `.codex/hooks.json` 和 `.codex/config.toml` inline hooks；二选一，优先 `.codex/hooks.json`。
- Hook 命令统一调用 `.agents/hooks/team-context-sync.*`，由同步脚本把运行时事件映射为中立事件。
- 已有 Hook 配置不得覆盖；只做合并，合并前先说明差异。
- Hook 只能自动记录事实，不写门禁决策、handoff reason、Next Action、blocker 业务判断。

## 中立事件映射

| 中立事件 | Claude Code 推荐来源 | Codex 推荐来源 | 说明 |
|----------|----------------------|----------------|------|
| `session_started` | `SessionStart` | `SessionStart` | 会话启动或恢复 |
| `agent_started` | `SubagentStart` | 无稳定原生事件 | Codex 由 TeamLead 在 spawn 后手动记录 |
| `agent_stopped` | `SubagentStop` | 无稳定原生事件 | Codex 由 TeamLead 在角色完成后手动记录 |
| `artifact_written` | `PostToolUse` on `Write|Edit` | `PostToolUse` on `apply_patch|Edit|Write` | 同步脚本需检查文件路径是否匹配 Spec artifact |
| `task_completed` | `TaskCompleted` | 无稳定原生事件 | Claude Code 任务完成事件不支持 matcher，脚本需自行过滤 |
| `issue_artifact_written` | 同上 | 同上 | 仅当路径匹配 `debugger/debug-*.md` 或 fix 文档 |
| `turn_finished` | `Stop` | `Stop` | 只做轻量一致性校准和 `updated_at` |
| `pr_updated` | `PostToolUse` 或 `Stop` 扫描 | `PostToolUse` 或 `Stop` 扫描 | 只在发现 PR URL 变化时更新 |

## Claude Code 项目级 Hook 样例

项目级 Claude Code Hook 写入 `.claude/settings.json`，可以提交到仓库。命令中优先用 `$CLAUDE_PROJECT_DIR` 引用项目根目录，避免从子目录启动 Claude Code 时路径漂移。

### POSIX shell 样例

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/team-context-sync.sh --runtime claude --neutral-event session_started"
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "spec-explorer|spec-writer|spec-tester|spec-executor|spec-debugger|spec-reviewer|spec-ender",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/team-context-sync.sh --runtime claude --neutral-event agent_started"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "spec-explorer|spec-writer|spec-tester|spec-executor|spec-debugger|spec-reviewer|spec-ender",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/team-context-sync.sh --runtime claude --neutral-event agent_stopped"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/team-context-sync.sh --runtime claude --neutral-event artifact_written"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/team-context-sync.sh --runtime claude --neutral-event task_completed"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/team-context-sync.sh --runtime claude --neutral-event turn_finished"
          }
        ]
      }
    ]
  }
}
```

### Windows PowerShell 样例

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "shell": "powershell",
            "command": "& \"$env:CLAUDE_PROJECT_DIR\\.agents\\hooks\\team-context-sync.ps1\" -Runtime claude -NeutralEvent session_started"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "shell": "powershell",
            "command": "& \"$env:CLAUDE_PROJECT_DIR\\.agents\\hooks\\team-context-sync.ps1\" -Runtime claude -NeutralEvent artifact_written"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "shell": "powershell",
            "command": "& \"$env:CLAUDE_PROJECT_DIR\\.agents\\hooks\\team-context-sync.ps1\" -Runtime claude -NeutralEvent task_completed"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "shell": "powershell",
            "command": "& \"$env:CLAUDE_PROJECT_DIR\\.agents\\hooks\\team-context-sync.ps1\" -Runtime claude -NeutralEvent turn_finished"
          }
        ]
      }
    ]
  }
}
```

Claude Code 支持 `SubagentStart` / `SubagentStop`，因此可以更接近地自动维护 `Runtime Handles`。如果当前 Claude Code 版本没有暴露稳定 handle，同步脚本只记录可获得的 `session_id`、`transcript_path`、agent matcher 和最近产物。

## Codex 项目级 Hook 样例

Codex Hook 需要开启 feature flag。项目级 Hook 放在 `.codex/hooks.json` 或 `.codex/config.toml` 中；项目 `.codex/` layer 必须被 Codex trust 后才会加载。

### `.codex/hooks.json` 样例

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/.agents/hooks/team-context-sync.mjs\" --runtime codex --neutral-event session_started",
            "statusMessage": "Syncing Spec team context"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "apply_patch|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/.agents/hooks/team-context-sync.mjs\" --runtime codex --neutral-event artifact_written",
            "statusMessage": "Recording Spec artifact"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/.agents/hooks/team-context-sync.mjs\" --runtime codex --neutral-event turn_finished",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

配套 `.codex/config.toml`：

```toml
[features]
codex_hooks = true
```

### `.codex/config.toml` inline 样例

仅当项目不使用 `.codex/hooks.json` 时使用 inline hooks：

```toml
[features]
codex_hooks = true

[[hooks.SessionStart]]
matcher = "startup|resume"
[[hooks.SessionStart.hooks]]
type = "command"
command = 'node "$(git rev-parse --show-toplevel)/.agents/hooks/team-context-sync.mjs" --runtime codex --neutral-event session_started'
statusMessage = "Syncing Spec team context"

[[hooks.PostToolUse]]
matcher = "apply_patch|Edit|Write"
[[hooks.PostToolUse.hooks]]
type = "command"
command = 'node "$(git rev-parse --show-toplevel)/.agents/hooks/team-context-sync.mjs" --runtime codex --neutral-event artifact_written'
statusMessage = "Recording Spec artifact"

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = 'node "$(git rev-parse --show-toplevel)/.agents/hooks/team-context-sync.mjs" --runtime codex --neutral-event turn_finished'
timeout = 30
```

Codex 当前没有与 Claude `SubagentStart` / `SubagentStop` 等价的稳定项目级 Hook 事件。`agent_started` 和 `agent_stopped` 应由 TeamLead 在 spawn、resume、close 或角色返回结果后写入 `lead/team-context.md`。

## 同步脚本最小职责

`team-context-sync.*` 至少应做这些事：

1. 从 stdin 读取运行时 Hook JSON。
2. 根据 `--runtime` 和 `--neutral-event` 映射到中立事件。
3. 从 `cwd` 或项目根目录定位当前活跃 Spec 的 `lead/team-context.md`。
4. 只更新允许自动维护的字段。
5. 保持 Markdown 表格结构，不删除未知列或未知区块。
6. 出错时退出非阻塞状态；除明确安全拦截外，不阻断正常 Spec 流程。

如果无法可靠定位当前 Spec，脚本应只记录 debug 信息或静默跳过，不能猜测写入错误的 `team-context.md`。
