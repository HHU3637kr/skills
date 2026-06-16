# 请先读我 START HERE

**token-efficiency v0.2.0** — 独立省 Token 插件（与任何其他产品无关）

## 最简单安装（推荐）

1. 解压本 zip 到任意文件夹  
2. 打开你的 Agent（Cursor / Codex / Claude Code / **Hermes** 等）  
3. **把下面整段复制发给 Agent：**

```
我解压了 token-efficiency 插件，路径是：【改成你的解压路径，例如 /Users/xxx/Desktop/token-efficiency-0.2.0】

请阅读该目录下的 AGENT_INSTALL.md，帮我完成安装：
1. 运行 install.sh（Windows 用 install.ps1）
2. 运行 python3 scripts/setup_student.py
3. 把 audit 报告摘要发给我
```

Agent 会自动帮你装。**Hermes 用户装完在 TUI 输入 `/reload-skills`。**

---

## 文档索引

| 文件 | 用途 |
|------|------|
| [AGENT_INSTALL.md](AGENT_INSTALL.md) | 给 Agent 看的安装步骤 |
| [docs/功能介绍.md](docs/功能介绍.md) | 这个插件是干什么的 |
| [docs/使用说明.md](docs/使用说明.md) | 完整命令手册 |
| [docs/公告.md](docs/公告.md) | 能省多少、为什么省（可转发群） |

---

## 手动安装（3 行）

```bash
cd token-efficiency-0.2.0
bash install.sh
python3 scripts/setup_student.py
```

Windows：`install.ps1` + `python scripts\setup_student.py`

---

## 装完怎么说

对 Agent 说：**「token audit」** 或 **「省 token」**
