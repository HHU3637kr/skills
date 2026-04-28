---
title: ClaudeCode官方扩展接管RoleChat设计探索报告
type: exploration-report
status: 已完成
created: 2026-04-28
spec: "[[README]]"
tags:
  - spec/exploration
  - vscode-extension
  - claude-code
---

# ClaudeCode官方扩展接管RoleChat设计探索报告

## 探索目标

验证是否可以用用户已安装的 Claude Code VS Code 扩展替代 R&K Flow 自研 Role Chat。

## 本机环境发现

已安装扩展：

```text
anthropic.claude-code@2.1.121
```

扩展位置：

```text
C:\Users\18735\.vscode\extensions\anthropic.claude-code-2.1.121-win32-x64
```

## Claude Code VS Code 扩展能力

已暴露命令：

```text
claude-vscode.sidebar.open
claude-vscode.editor.open
claude-vscode.primaryEditor.open
claude-vscode.editor.openLast
claude-vscode.newConversation
claude-vscode.focus
claude-vscode.terminal.open
```

视图贡献点：

```json
{
  "secondarySidebar": [
    {
      "id": "claude-sidebar-secondary",
      "title": "Claude Code"
    }
  ],
  "views": {
    "claude-sidebar-secondary": [
      {
        "type": "webview",
        "id": "claudeVSCodeSidebarSecondary",
        "name": "Claude Code"
      }
    ]
  }
}
```

URI handler 支持：

```text
vscode://anthropic.claude-code/open?prompt=...
```

内部实现会将 `/open` 的 `prompt` 参数传入 `claude-vscode.primaryEditor.open`，用于打开新会话并预填 prompt。

## 关键限制

- Claude Code 扩展没有公开第三方 Chat API
- R&K Flow 不能嵌入或读取 Claude Code Webview DOM
- Claude Code 会在本地保留部分会话/转录文件，但这是私有存储，不是稳定集成 API
- R&K Flow 不能把 Claude Code 本地聊天记录当作实时编排协议或可靠主数据源
- 不能依赖 Claude Code 扩展内部 bundle 或私有状态结构
- 自动提交 prompt 不属于公开稳定入口；可依赖的是打开、聚焦、预填

## 本地会话存储判断

本机可以看到 Claude Code 相关本地数据目录：

```text
~/.claude/projects/
~/.claude/sessions/
~/.claude/transcripts/
~/.claude/history.jsonl
```

Claude Code 配置 schema 中也存在 transcript/session 保留策略，例如 `cleanupPeriodDays`，说明本地记录确实存在。

但这只能说明“可被用户授权后读取”，不能说明“可作为扩展间稳定协议”。主要原因：

- 存储路径、文件格式、session 映射关系属于 Claude Code 私有实现，版本升级可能变化
- transcript 可能被清理、禁用或只保留部分内容
- 读取本地记录只能得到事后数据，不能稳定完成发送、提交、恢复会话等控制动作
- 读取全量 Claude Code 历史涉及明显隐私边界，必须显式授权且限定范围
- TeamBus 需要的是可审计、可路由、可复现的角色间通信事件，私有 transcript 不满足主协议要求

## 架构判断

可行路径：

- R&K Flow 将自研 Role Chat 降级为 Role Launcher
- 点击 Role 后打开 Claude Code 官方 sidebar 或新 Tab
- R&K Flow 生成 Role Prompt，携带 Spec、Role、TeamBus 协议上下文
- 自动化团队通信仍走 R&K CLI Adapter + TeamBus
- 后续可提供“导入 Claude transcript / 绑定 Claude session”的显式授权只读能力，作为辅助审计或上下文补全

不可行路径：

- 直接把 Claude Code Chat UI 嵌入 R&K Webview
- 把 Claude Code 官方本地聊天记录作为 R&K TeamBus 的实时主数据源
- 基于 Claude Code 私有 bundle 做反射调用

## 方向修订

用户已放弃“Claude Code 官方扩展接管 Role Chat”的方案，原因是该方案只能做到打开、聚焦、预填，无法稳定接管多轮会话、会话隔离、审计和 TeamBus 编排。

最新产品方向：

- R&K Flow 继续维护自研 Role Chat UI
- MVP 后端只支持 Claude Code CLI
- 暂时不支持 Codex CLI
- 保留 `AgentAdapter` 抽象，后续需要新 CLI 时再新增具体 Adapter
- Claude Code 官方扩展探索结论作为边界依据保留，不作为实现依赖

## 结论

推荐采用“自研聊天 UI + 单后端 Adapter”架构：

- 人机交互入口：R&K Flow Role Chat
- 编排与审计入口：R&K Flow TeamBus + ClaudeCodeAdapter

这样会增加 Role Chat UI 的维护责任，但可以保证 R&K Flow 对会话隔离、审计日志、角色间通信和后续编排能力拥有可控边界。
