# Phoenix / 不死鸟 集成（v0.2）

token-efficiency **独立运行**。Phoenix 用户额外获得 L5 ledger 分析。

## 自动探测 Ledger

```bash
python3 scripts/ledger_report.py
```

探测顺序：

1. 环境变量 `TOKEN_EFFICIENCY_LEDGER` 或 `PHOENIX_TOKEN_LEDGER`
2. `~/.hermes/phoenix/data/token_ledger.jsonl`
3. `~/.phoenix/data/token_ledger.jsonl`

## 与 audit 合并

```bash
python3 scripts/audit.py --project ~ --with-ledger
```

## 输出内容

- 各 tier（daily / deep / god）confirm_box 次数与成本区间
- 模型使用分布
- 高频 task_preview — 识别是否小活用高档

## L5 建议规则

| Ledger 信号 | 建议 |
|-------------|------|
| deep/god tier 占比高 | 探索用 daily，写代码再升档 |
| 同一 preview 重复 confirm | 任务拆小或换 Ask 模式 |
| L0 audit 仍高 | 先 fix_skills，再谈 tier |

## 不需要 Phoenix

无 ledger 文件时，`ledger_report.py` 退出码 1，**不影响** audit / install / fix_skills。
