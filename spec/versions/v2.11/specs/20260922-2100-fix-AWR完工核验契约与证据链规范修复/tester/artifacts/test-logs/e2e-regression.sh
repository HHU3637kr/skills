#!/usr/bin/env bash
# e2e-regression.sh — AWR 0.5.0 正修正路径全流程自动化回归脚本
# 由运行自身产出 e2e-completion-verify.log，杜绝手写证据
set -euo pipefail

SANDBOX_DIR="/tmp/awr-fixed-verify-run"
rm -rf "$SANDBOX_DIR" && mkdir -p "$SANDBOX_DIR"
cd "$SANDBOX_DIR"

git init -q -b dev
git config user.email "test@rkflow.local"
git config user.name "RK Test"

cat > GOALS.md <<'EOF'
# Project goal {#intake-goal status=active}
AWR 完工契约全流程回归测试（修复后正例全链路）
EOF

cat > work-ledger.yaml <<'EOF'
work_items:
  - id: WORK-VERIFY-002
    kind: feat
    title: 验证开工推进与完工直接释放全流程
    status: ready
    goal: "goal#intake-goal"
    priority: P0
    required: true
    depends_on: []
    acceptance:
      - 验收断言 1 成立
      - 验收断言 2 成立
    next_action: 开工
    summary: 闭环测试
EOF

mkdir -p .awr scripts
cat > .awr/project.toml <<'EOF'
[project]
name = "verify-fixed"
authority_mode = "source_first"
authorized_roots = []
context_profile = "minimal"

[[sources]]
domain = "goal"
role = "primary"
path = "GOALS.md"
adapter = "markdown-heading-v1"
[sources.options]
status = "active"
key_prefix = "goal"

[[sources]]
domain = "ledger"
role = "primary"
path = "work-ledger.yaml"
adapter = "yaml-ledger-v1"
[sources.options]
EOF

cp /home/WorkSpace/skills/scripts/rk-awr-checkpoint.sh scripts/rk-awr-checkpoint.sh
git add -A && git commit -q -m "chore: init"

awr init --project . --manifest .awr/project.toml --accept
awr source reindex

echo "=== 1. 首发认领与 work progress 推进开工 (消灭 P0-2) ==="
REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
START_OUT=$(awr session start --work WORK-VERIFY-002 --agent spec-explorer --provider omp --model default --claim --ttl-ms 3600000 --expected-revision "$REV" --json)
EXP_SESS=$(printf "%s" "$START_OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['id'])")
REV=$(printf "%s" "$START_OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
echo "explorer claimed: session=$EXP_SESS, rev=$REV"

awr work progress WORK-VERIFY-002 --summary "开工探索并推进状态" --next-action "进入测试与设计" --session "$EXP_SESS" --reason "开工推进" --expected-revision "$REV" --json >/dev/null
echo "progress_rc=$?"
REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
echo "台账状态确认: $(grep 'status:' work-ledger.yaml)"

echo "=== 2. 角色交接接力到 spec-ender (合法接力非终态工作项) ==="
bash scripts/rk-awr-checkpoint.sh --work WORK-VERIFY-002 --agent spec-ender --digest "接力开工准备归档" --next-action "执行机器核验与释放"
ENDER_SESS=$(awr session list --active --limit 100 --json | python3 -c "import sys,json;print(json.load(sys.stdin)['sessions'][0]['id'])")
REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
echo "ender active session: $ENDER_SESS, rev=$REV"

echo "=== 3. 生成报告并执行 prepare-completion ==="
SHA=$(git rev-parse HEAD)
mkdir -p artifacts
cat > artifacts/rep.json <<EOF
{
  "version": 1,
  "work_item": "WORK-VERIFY-002",
  "source_sha": "$SHA",
  "command": "bash tests/run.sh",
  "scope": ["WORK-VERIFY-002"],
  "verified_at": 1790000000000,
  "checks": [
    {"name": "TC-01", "passed": true, "details": "d1", "criteria": ["验收断言 1 成立"]},
    {"name": "TC-02", "passed": true, "details": "d2", "criteria": ["验收断言 2 成立"]}
  ]
}
EOF
awr work prepare-completion --report artifacts/rep.json --evidence-key "WORK-VERIFY-002/evidence/test-run" --source-sha "$SHA" WORK-VERIFY-002 --json > prepare_out.json
echo "prepare_rc=$?"
cat prepare_out.json | python3 -c "import sys,json;d=json.load(sys.stdin);print('prepare stage:',d.get('stage'),'ok:',d.get('ok'))"

echo "=== 4. 剔除 branch/work 字段注册 evidence add (消灭 P2) ==="
REPORT_SHA=$(sha256sum artifacts/rep.json | awk '{print $1}')
cat > /tmp/clean_draft.json <<EOF
{
  "external_key": "WORK-VERIFY-002/evidence/test-run",
  "work_item_key": "WORK-VERIFY-002",
  "evidence_type": "verification_report",
  "level": "locally_verified",
  "locator": "artifacts/rep.json",
  "sha256": "$REPORT_SHA",
  "source_sha": "$SHA",
  "command": "bash tests/run.sh",
  "scope": ["WORK-VERIFY-002"],
  "summary": "rep",
  "verified_at": 1790000000000
}
EOF
awr evidence add --input /tmp/clean_draft.json --expected-revision "$REV" --json > add_out.json
echo "add_rc=$?"
REV=$(cat add_out.json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")

echo "=== 5. 由 spec-ender 在同一会话执行 work complete ==="
cat > /tmp/comp_input.json <<EOF
{
  "version": 1,
  "source_sha": "$SHA",
  "acceptance": [
    {"criterion": "验收断言 1 成立", "evidence": ["WORK-VERIFY-002/evidence/test-run"]},
    {"criterion": "验收断言 2 成立", "evidence": ["WORK-VERIFY-002/evidence/test-run"]}
  ]
}
EOF
awr work complete --session "$ENDER_SESS" --reason "验收通过" --input /tmp/comp_input.json --expected-revision "$REV" WORK-VERIFY-002 --json > comp_out.json
echo "complete_rc=$?"

echo "=== 6. 现查 CAS 版本号并直接调用 session end 释放租约 (消灭 P0-1) ==="
LATEST_REV=$(awr status --json | python3 -c "import sys,json;print(json.load(sys.stdin)['project_revision'])")
echo "latest project_revision after complete is: $LATEST_REV"
awr session end --session "$ENDER_SESS" --outcome ended --expected-revision "$LATEST_REV" --json > end_out.json
echo "end_rc=$?"

echo "=== 7. 执行 awr doctor 终审 ==="
awr doctor 2>&1 | tail -6
echo "=== 全部回归成功完成 ==="
