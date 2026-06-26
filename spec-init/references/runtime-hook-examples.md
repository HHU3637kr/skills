# Runtime Hook Examples

本文件给 `spec-init` 使用：当项目需要为 `lead/team-context.md` 自动记账时，参考这里生成运行时 Hook 适配。中立协议仍以 `team-context-hook-contract.md` 为准；本文件只提供 Claude Code 和 Codex 的项目级配置样例。

> 参考来源：
> - Claude Code Hooks: https://code.claude.com/docs/en/hooks
> - Codex Hooks: https://developers.openai.com/codex/hooks

## 使用原则

- 优先创建项目级配置，不写用户全局配置：
  - Claude Code: `.claude/settings.json`
  - Codex: `.codex/hooks.json` 或 `.codex/config.toml`
  - OMP: `.omp/hooks/post/*.ts`（TS 工厂函数，非命令行 JSON 配置）
- 不同时在同一个 Codex layer 使用 `.codex/hooks.json` 和 `.codex/config.toml` inline hooks；二选一，优先 `.codex/hooks.json`。
- Hook 命令统一调用 `.agents/hooks/team-context-sync.*`，由同步脚本把运行时事件映射为中立事件。
- 已有 Hook 配置不得覆盖；只做合并，合并前先说明差异。
- Hook 只能自动记录事实，不写门禁决策、handoff reason、Next Action、blocker 业务判断。

## 中立事件映射

| 中立事件 | Claude Code 推荐来源 | Codex 推荐来源 | OMP 推荐来源 | 说明 |
|----------|----------------------|----------------|--------------|------|
| `session_started` | `SessionStart` | `SessionStart` | `pi.on("session_start")` | 会话启动或恢复 |
| `agent_started` | `SubagentStart` | 无稳定原生事件 | `pi.on("agent_start")` | OMP 子 Agent 启动事件 |
| `agent_stopped` | `SubagentStop` | 无稳定原生事件 | `pi.on("agent_end")` | OMP 子 Agent 结束事件 |
| `artifact_written` | `PostToolUse` on `Write|Edit` | `PostToolUse` on `apply_patch|Edit|Write` | `pi.on("tool_result")` 过滤 `write`/`edit` | 同步脚本需检查文件路径是否匹配 Spec artifact |
| `task_completed` | `TaskCompleted` | 无稳定原生事件 | `pi.on("tool_result")` 过滤 `todo` | OMP 无独立任务完成事件，从 todo 工具结果推断 |
| `issue_artifact_written` | 同上 | 同上 | 同上 | 仅当路径匹配 `debugger/debug-*.md` 或 fix 文档 |
| `turn_finished` | `Stop` | `Stop` | `pi.on("turn_end")` | 只做轻量一致性校准和 `updated_at` |
| `pr_updated` | `PostToolUse` 或 `Stop` 扫描 | `PostToolUse` 或 `Stop` 扫描 | `pi.on("tool_result")` 过滤 `bash`(git/gh) | 只在发现 PR URL 变化时更新 |

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

## OMP 项目级 Hook 样例

OMP（Oh My Pi）的 Hook 不是命令行 JSON 配置，而是 default-export 的 TS 工厂函数，放在
`.omp/hooks/post/*.ts`。OMP 不读取 `.claude/settings.json` 也不读取 `.codex/hooks.json`。
工厂函数通过 `pi.on(event, handler)` 注册运行时事件，可用 `pi.exec(...)` 调用同步脚本，
或直接用 `pi.appendEntry(...)` 持久化非 LLM 状态。

### `.omp/hooks/post/team-context-sync.ts` 样例

```ts
import type { HookAPI } from "@oh-my-pi/pi-coding-agent/extensibility/hooks";

// 把 OMP 运行时事件映射为中立事件，交给中立同步脚本处理。
// 同步逻辑本身仍遵循 .agents/hooks/team-context-hook-contract.md。
//
// 注意 OMP 的 pi.exec 签名：exec(command, argsArray, options) —— 直接 argv 执行（非 shell），
// 不支持 stdin/input。因此命令与参数必须分开传，且不通过 stdin 透传 payload。
export default function (pi: HookAPI): void {
  const script = `${process.cwd()}/.agents/hooks/team-context-sync.mjs`;
  const sync = (neutralEvent: string) =>
    pi.exec("node", [script, "--runtime", "omp", "--neutral-event", neutralEvent], {});

  // 会话启动/恢复 -> session_started
  pi.on("session_start", async () => {
    await sync("session_started");
  });

  // 子 Agent（角色实例）启动/结束 -> agent_started / agent_stopped
  pi.on("agent_start", async () => {
    await sync("agent_started");
  });
  pi.on("agent_end", async () => {
    await sync("agent_stopped");
  });

  // 产物写入 -> artifact_written / issue_artifact_written / pr_updated
  pi.on("tool_result", async (event) => {
    if (event.isError) return;
    if (event.toolName === "write" || event.toolName === "edit") {
      const path = String(event.input.path ?? "");
      const neutral = /debugger\/debug-.*\.md$/.test(path)
        ? "issue_artifact_written"
        : "artifact_written";
      await sync(neutral);
    } else if (event.toolName === "todo") {
      await sync("task_completed");
    } else if (event.toolName === "bash") {
      const cmd = String(event.input.command ?? "");
      if (/\bgh\b|git push|pull request/.test(cmd)) {
        await sync("pr_updated");
      }
    }
  });

  // 一轮输出完成 -> turn_finished
  pi.on("turn_end", async () => {
    await sync("turn_finished");
  });

  // 上下文压缩前 -> 把当前 Spec 的 lead/team-context.md 恢复要点重注入，
  // 保证压缩后仍能从落盘账本恢复阶段/门禁/Loop Budget。OMP 独有能力。
  pi.on("session.compacting", async () => {
    const ctx = await pi.exec(
      "node",
      [script, "--runtime", "omp", "--neutral-event", "compaction_context"],
      {},
    );
    const text = String(ctx?.stdout ?? "").trim();
    if (!text) return; // 定位不到活跃 Spec 时不注入，避免污染上下文
    return {
      context: [text],
      preserveData: { rk_flow_team_context: text },
    };
  });
}
```

OMP Hook 注意事项：

- OMP 在默认运行时把发现的 `.omp/hooks/**` TS 工厂当作 extension 模块加载，`pi.on(...)` 绑定到运行时事件总线；启动时也可用 `--hook <path>`（等价于 `--extension`）显式加载。
- OMP 的 `pi.exec(command, argsArray, options)` 是 argv 直接执行（非 shell），不支持 stdin/`input`。命令与参数必须分开传（`pi.exec("node", [script, "--runtime", "omp", ...], {})`），不要拼成单条 shell 字符串，也不要靠 stdin 透传 payload——这是早期样例的常见 bug。
- `tool_result` 是后置事件，只能读结果、做记账，不应在这里阻断流程（阻断逻辑属于 `tool_call` 前置事件）。
- OMP 没有独立的「任务完成」事件，`task_completed` 从 `todo` 工具结果推断；`pr_updated` 从 `bash` 的 git/gh 命令推断。两者都应在同步脚本里二次过滤，避免误记。
- 若用户不希望注入 TS Hook，或运行环境不便加载，则降级跳过，只保留中立协议，由 TeamLead / 各角色手动维护 `lead/team-context.md`。
- 已存在的 `.omp/hooks/**` 不覆盖；需要更新先说明差异并等待用户确认。
- `session.compacting` 的 `compaction_context` 与其它中立事件方向相反：它是**只读输出**，不写 `lead/team-context.md`，而是把账本里的恢复要点（阶段、门禁状态、Loop Budget、Next Action、未确认产物）打印到 stdout 供 hook 注入。它不在 `team-context-hook-contract.md` 的「自动更新」事件之列，因为它不改账本、只读账本，所以不违反「Hook 只记录事实、不推断业务」边界。
- 注入内容应精简（建议只摘当前阶段、门禁决策、Loop Budget、Next Action 和未确认产物清单），不要把整份 plan/test/debug 正文塞进压缩上下文。

## 同步脚本最小职责

`team-context-sync.*` 至少应做这些事：

1. 读取入参：`--runtime` 与 `--neutral-event`。OMP 的 `pi.exec` 是 argv 直接执行、不透传 stdin，所以脚本以 argv 为唯一可靠入口；即使 Claude Code / Codex 会在 stdin 提供 hook JSON，下面的参考实现也统一不依赖 stdin，避免跨 runtime 行为分叉。
2. 根据 `--neutral-event` 映射到中立事件；事实信息一律从 `cwd` 扫描文件状态（最近改动的 `lead/team-context.md`、Spec artifact、git 分支/PR）自行推断，而非读事件体 payload。
3. 从 `cwd` 或项目根目录定位当前活跃 Spec 的 `lead/team-context.md`。
4. 只更新允许自动维护的字段。
5. 保持 Markdown 表格结构，不删除未知列或未知区块。
6. 出错时退出非阻塞状态；除明确安全拦截外，不阻断正常 Spec 流程。
7. 收到 `--neutral-event compaction_context` 时进入**只读模式**：不写任何文件，定位活跃 Spec 后把恢复要点（阶段、门禁、Loop Budget、Next Action、未确认产物）打印到 stdout；定位不到则输出空，由 hook 跳过注入。

如果无法可靠定位当前 Spec，脚本应只记录 debug 信息或静默跳过，不能猜测写入错误的 `team-context.md`。

### `.agents/hooks/team-context-sync.mjs` 参考实现

下面是满足上述职责的最小可运行实现。它用 `node:fs` 直接读写（不经 agent 的
`write`/`edit` 工具，避免触发 `tool_result` 反馈循环），只更新 `updated_at`
这一事实字段，`compaction_context` 走只读分支，任何异常都 `exit 0` 非阻塞。
更精细的 Artifact Registry / Task Progress 映射可按需扩展，但必须保持表格结构、
不删除未知字段、不推断业务结论。

```js
#!/usr/bin/env node
// team-context-sync.mjs — 中立 Team Context 同步脚本
//
// 把运行时 Hook 的中立事件映射到当前活跃 Spec 的 lead/team-context.md，
// 只记录事实事件，遵循 .agents/hooks/team-context-hook-contract.md。
// 出错时退出非阻塞状态（exit 0），不阻断正常 Spec 流程。
//
// 用法:
//   node team-context-sync.mjs --runtime <omp|claude|codex> --neutral-event <event>
// 事件类型由 --neutral-event 决定；OMP 的 pi.exec 不透传 stdin。

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

const runtime = flag("runtime") ?? "unknown";
const neutralEvent = flag("neutral-event") ?? "";
const projectRoot = process.cwd();

// 定位当前活跃 Spec：在 spec/03-能力交付 等分类目录下找含 lead/team-context.md
// 且 mtime 最新的 Spec 目录。
function findActiveTeamContext() {
  const specRoot = join(projectRoot, "spec");
  if (!existsSync(specRoot)) return undefined;
  const categories = readdirSync(specRoot).filter((d) => {
    const p = join(specRoot, d);
    return existsSync(p) && statSync(p).isDirectory() && d !== "context" && d !== "06-已归档";
  });
  let best;
  for (const cat of categories) {
    const catPath = join(specRoot, cat);
    for (const spec of readdirSync(catPath)) {
      const ctx = join(catPath, spec, "lead", "team-context.md");
      if (existsSync(ctx)) {
        const mtime = statSync(ctx).mtimeMs;
        if (!best || mtime > best.mtime) best = { path: ctx, mtime };
      }
    }
  }
  return best?.path;
}

function nowIso() {
  return new Date().toISOString();
}

// 只更新 frontmatter 中的 updated_at（事实字段），保持其余结构不变。
function touchUpdatedAt(file) {
  let text = readFileSync(file, "utf8");
  if (/^updated_at:.*$/m.test(text)) {
    text = text.replace(/^updated_at:.*$/m, `updated_at: ${nowIso()}`);
  } else if (text.startsWith("---")) {
    text = text.replace(/^---\n/, `---\nupdated_at: ${nowIso()}\n`);
  }
  writeFileSync(file, text);
}

// compaction_context: 只读账本，把恢复要点打印到 stdout，不写文件。
function emitCompactionContext(file) {
  const text = readFileSync(file, "utf8");
  const want = [
    "Current Run Path",
    "Gate Decisions",
    "Loop Budget",
    "Next Action",
    "Open Questions / Blockers",
  ];
  const lines = text.split("\n");
  const out = [];
  let capturing = false;
  for (const line of lines) {
    const h = line.match(/^#+\s+(.*)$/);
    if (h) capturing = want.some((w) => h[1].includes(w));
    if (capturing) out.push(line);
  }
  process.stdout.write(out.join("\n").trim());
}

try {
  if (neutralEvent === "compaction_context") {
    const file = findActiveTeamContext();
    if (file) emitCompactionContext(file);
    process.exit(0);
  }

  void runtime; // 保留供未来按 runtime 精细映射使用

  const file = findActiveTeamContext();
  if (!file) process.exit(0); // 定位不到活跃 Spec，静默跳过

  // 当前最小实现：所有写入类事件只更新 updated_at 这一事实字段。
  switch (neutralEvent) {
    case "session_started":
    case "agent_started":
    case "agent_stopped":
    case "artifact_written":
    case "issue_artifact_written":
    case "task_completed":
    case "pr_updated":
    case "turn_finished":
      touchUpdatedAt(file);
      break;
    default:
      break;
  }
  process.exit(0);
} catch {
  // Hook 出错不阻断 Spec 流程
  process.exit(0);
}
```
