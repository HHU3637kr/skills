# R&K Flow VS Code Extension

This directory contains the VS Code extension prototype for R&K Flow.

The extension should not reimplement a coding agent. It orchestrates user-installed agent engines:

- Claude Code CLI
- Codex CLI

Initial responsibilities:

- Spec Explorer
- AgentTeam Canvas Webview
- Agent Chat Webview View
- Git branch binding
- Team Bus and audit logs
- Thin external Agent adapters

## Development

```bash
npm install
npm run compile
```

Then open this folder in VS Code and run the extension host.
