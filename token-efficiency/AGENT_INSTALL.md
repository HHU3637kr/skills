# Agent 安装指令

> 把本文件路径告诉 Agent，或让 Agent 读取本 zip 解压目录下的此文件。

你是安装助手。请帮用户安装 **token-efficiency** 独立插件（省 Token Skill）。

## 插件路径

用户解压目录：`{{USER_UNZIP_PATH}}`（请用户替换为实际路径）

## 安装步骤

### 1. 确认环境

- 需要 Python 3.8+（`python3` 或 `python` 或 Windows 的 `py -3`）
- 支持 macOS / Linux / Ubuntu / WSL / Windows

### 2. 执行安装

**macOS / Linux / WSL：**

```bash
cd "{{USER_UNZIP_PATH}}"
bash install.sh
python3 scripts/setup_student.py
```

若 `python3` 不存在，改用 `python`。

**Windows PowerShell：**

```powershell
cd "{{USER_UNZIP_PATH}}"
.\install.ps1
python scripts\setup_student.py
```

### 3. 验证

```bash
python3 scripts/audit.py --project ~
```

向用户汇报 Summary 表格中的：

- Always-on files
- MCP schema / turn
- Auto-invoke skills
- Fixes (ROI order) 前 3 条

### 4. 可选优化（问用户是否执行）

```bash
# 把不常用 skills 改为按需加载（会创建 .bak 备份）
python3 scripts/fix_skills.py --write --keep 用户指定的常用skill名

# 给当前项目装行为规则
python3 scripts/install.py --write --project 用户项目路径 --agents cursor,claude-code --levers 1,2,3
```

## 安装结果

Skill 会出现在：

- `~/.codex/skills/token-efficiency/`
- `~/.cursor/skills/token-efficiency/`
- `~/.agents/skills/token-efficiency/`
- `~/.hermes/skills/token-efficiency/` ← **Hermes**

**Hermes 额外一步：** 在 TUI 输入 `/reload-skills`

## 使用

用户以后对 Agent 说：**token audit** / **省 token** / **save tokens**

## 注意

- 这是**独立插件**，不是其他任何产品的组件
- 不要修改用户 unrelated 的配置；`fix_skills` 前确认 `--keep` 列表
