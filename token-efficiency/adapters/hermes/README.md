# Hermes 适配

**token-efficiency** 独立插件，与 Hermes 内其他模块无绑定。

## 安装 Skill（主要方式）

```bash
python3 scripts/install_skill.py --write --targets hermes
```

或默认安装（已含 hermes）：

```bash
bash install.sh
```

安装路径：`~/.hermes/skills/token-efficiency/`

## 安装后

在 Hermes TUI 执行：

```
/reload-skills
```

## 使用

对话中说：

- `token audit`
- `省 token`
- `save tokens`

## 可选：规则写入 SOUL.md

```bash
python3 scripts/install.py --write --agents hermes --levers 1,2,3
```

追加到 `~/.hermes/SOUL.md`（带 marker，可重复执行不 duplicate）。

## 可选：Ledger 分析

若存在 `~/.hermes/phoenix/data/token_ledger.jsonl`：

```bash
python3 scripts/ledger_report.py
```

用于分析模型档位使用（L5），**无文件则跳过，不影响其他功能**。
