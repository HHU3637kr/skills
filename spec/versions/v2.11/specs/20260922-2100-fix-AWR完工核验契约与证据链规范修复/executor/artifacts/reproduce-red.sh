#!/usr/bin/env bash
# reproduce-red.sh — 静态契约硬断言脚本（TDD 先行断言）
set -u

FAIL_COUNT=0

assert_contains_regex() {
  local desc="$1"
  local file="$2"
  local pattern="$3"
  if grep -E -q "$pattern" "$file" 2>/dev/null; then
    echo "✅ PASS: $desc"
  else
    echo "❌ FAIL: $desc (未在 $file 找到正则模式 '$pattern')"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "=== 执行静态契约断言 ==="
assert_contains_regex "TC-STATIC-01: spec-test 必须包含 completion.report.v1 说明" "spec-test/SKILL.md" "completion\.report\.v1"
assert_contains_regex "TC-STATIC-02: awr-integration.md 必须包含 work complete 协议" ".agents/rules/awr-integration.md" "work complete"
assert_contains_regex "TC-STATIC-03: awr-integration.md 必须包含 40 位完整 SHA 约束" ".agents/rules/awr-integration.md" "(40 ?位完整|40-char|full (git )?SHA|完整.{0,4}SHA)"
assert_contains_regex "TC-STATIC-04: tdd-discipline.md 必须包含空桩与杜绝全 SKIP 假红" "spec-execute/references/tdd-discipline.md" "空桩"
assert_contains_regex "TC-STATIC-05: spec-end 必须包含 work complete 完工引导" "spec-end/SKILL.md" "work complete"
assert_contains_regex "TC-STATIC-06: v2.11/plan.html 必须包含本 fix Spec 规划" "spec/versions/v2.11/plan.html" "20260922-2100"

echo "----------------------------------------"
echo "断言失败总数: $FAIL_COUNT"
if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
