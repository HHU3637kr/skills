---
id: EXP-001
title: Windows下CLI调用避免Shell拼接
keywords: [Windows, CLI, spawn, Claude Code, Codex, shim]
scenario: VS Code 扩展或 Node.js 进程需要在 Windows 下稳定调用 Claude Code / Codex CLI
created: 2026-04-28
---

# Windows下CLI调用避免Shell拼接

## 困境

在 VS Code 扩展中调用 Claude Code / Codex CLI 时，如果直接使用 `cmd /c`、`shell: true` 或字符串拼接命令，Windows 环境会把包含特殊字符的路径或参数错误拆分。例如项目名 `R&K Flow` 中的 `&` 会被 shell 当作命令分隔符，导致出现 `'K' is not recognized` 这类错误。

同时，npm 安装的 CLI 往往是 `.cmd` shim。直接把 shim 交给 shell 执行会放大转义问题，也会让参数边界不清晰。

## 策略

1. 使用 `spawn(command, args, { shell: false })`，所有参数通过数组传入。
2. Windows 下先用 `where.exe` 定位 CLI shim。
3. 对 Claude Code，读取 `claude.cmd` 并解析其中真实的 `claude.exe` 路径。
4. 对 Codex CLI，解析 npm shim 目录，使用 `node.exe <codex.js> ...args` 启动。
5. 工作目录通过 `spawn` 的 `cwd` 参数传入，不混入命令字符串。
6. 为 CLI 参数构造补充回归测试，特别覆盖 `claude --resume` 与 `codex exec resume --json`。

## 理由

把命令和参数拆开可以避免 Windows shell 的二次解析。直接解析 shim 后调用真实可执行文件，可以减少 `cmd.exe` 对特殊字符、引号、空格和路径的干扰。对 Codex resume 这类子命令，还需要用本机 `--help` 校验参数形态，因为不同子命令支持的参数并不完全相同。

## 相关文件

- rk-flow-vscode-extension/src/agentAdapters/cliAdapters.ts
- rk-flow-vscode-extension/src/test/suite/extension.test.ts
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/update-003-summary.md
- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/update-004-summary.md

## 参考

- spec/06-已归档/20260428-1335-VSCode扩展包AgentTeam编排设计/logs/real-agent-claude-adapter-shellfix.log
