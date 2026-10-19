#!/usr/bin/env bash
# ==============================================================================
# R&K Flow CLI 中立化脚手架自动化测试脚本 (含 P0/P1/P2 防回归与全流程强断言)
# ==============================================================================
set -u

SCRIPT_UNDER_TEST="${1:-scripts/init-ai-workflow.sh}"
SCRIPT_PATH="$(cd "$(dirname "$SCRIPT_UNDER_TEST")" && pwd)/$(basename "$SCRIPT_UNDER_TEST")"
ROOT_DIR="$(pwd)"
LOCAL_SKILLS_DIR="$ROOT_DIR"

echo "================================================================="
echo "🧪 正在执行脚手架 CLI 中立化测试 (目标脚本: $SCRIPT_PATH)"
echo "================================================================="

FAIL_COUNT=0
PASS_COUNT=0

assert_eq() {
  local desc="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✅ PASS: $desc"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ❌ FAIL: $desc (期望: '$expected', 实际: '$actual')"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_file_exists() {
  local desc="$1"
  local file="$2"
  if [ -f "$file" ]; then
    echo "  ✅ PASS: $desc (文件存在: $file)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ❌ FAIL: $desc (文件不存在: $file)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_file_not_exists() {
  local desc="$1"
  local file="$2"
  if [ ! -e "$file" ]; then
    echo "  ✅ PASS: $desc (文件不存在: $file)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ❌ FAIL: $desc (意外存在文件/目录: $file)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_dir_exists() {
  local desc="$1"
  local dir="$2"
  if [ -d "$dir" ]; then
    echo "  ✅ PASS: $desc (目录存在: $dir)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ❌ FAIL: $desc (目录不存在: $dir)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_contains() {
  local desc="$1"
  local file="$2"
  local pattern="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "  ✅ PASS: $desc"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ❌ FAIL: $desc (未在 $file 中找到模式: '$pattern')"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# ------------------------------------------------------------------------------
# Test 1: 默认纯中立执行 (不传 --runtime)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-01] 场景 1: 默认纯中立执行 (不传 --runtime)"
TMP_DIR_1="$(mktemp -d /tmp/test-scaffold-none-XXXXXX)"
export SKILLS_REPO_URL="file://$LOCAL_SKILLS_DIR"
(
  cd "$TMP_DIR_1"
  bash "$SCRIPT_PATH" "$TMP_DIR_1" >/dev/null 2>&1
)
RC_1=$?
assert_eq "脚手架执行必须成功退出 (RC=0)" "0" "$RC_1"

assert_file_exists "根目录必存在 AGENTS.md" "$TMP_DIR_1/AGENTS.md"
assert_file_not_exists "不得存在 .omp/AGENTS.md" "$TMP_DIR_1/.omp/AGENTS.md"
assert_file_not_exists "默认不得生成 .omp 目录" "$TMP_DIR_1/.omp"
assert_dir_exists ".agents/roles 目录必存在" "$TMP_DIR_1/.agents/roles"

ROLES=(spec-explorer spec-writer spec-tester spec-executor spec-debugger spec-reviewer spec-ender)
for r in "${ROLES[@]}"; do
  role_path="$TMP_DIR_1/.agents/roles/${r}.md"
  assert_file_exists "中立角色文件必须存在: $r" "$role_path"
  if [ -f "$role_path" ]; then
    assert_contains "角色定义 $r 必须为无损完整定义 (含 inputs:)" "$role_path" "inputs:"
    assert_contains "角色定义 $r 必须为无损完整定义 (含 rules:)" "$role_path" "rules:"
  fi
done

# 断言后续步骤 9-12 完整性 (P0-2 守卫)
assert_file_exists "spec/versions/README.md 必须生成" "$TMP_DIR_1/spec/versions/README.md"
assert_file_exists "经验索引 spec/context/experience/index.md 必须生成" "$TMP_DIR_1/spec/context/experience/index.md"
assert_file_exists "知识索引 spec/context/knowledge/index.md 必须生成" "$TMP_DIR_1/spec/context/knowledge/index.md"
assert_file_exists "GOALS.md 必须生成" "$TMP_DIR_1/GOALS.md"
assert_file_exists "work-ledger.yaml 必须生成" "$TMP_DIR_1/work-ledger.yaml"
assert_contains ".gitignore 必须包含 .awr/state.db" "$TMP_DIR_1/.gitignore" ".awr/state.db"
assert_file_exists "目标工程必须具备 scripts/rk-awr-checkpoint.sh" "$TMP_DIR_1/scripts/rk-awr-checkpoint.sh"
rm -rf "$TMP_DIR_1"

# ------------------------------------------------------------------------------
# Test 2: OMP 按需适配 (--runtime omp)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-02] 场景 2: OMP 按需适配 (--runtime omp)"
TMP_DIR_2="$(mktemp -d /tmp/test-scaffold-omp-XXXXXX)"
(
  cd "$TMP_DIR_2"
  bash "$SCRIPT_PATH" "$TMP_DIR_2" --runtime omp >/dev/null 2>&1
)
RC_2=$?
assert_eq "OMP 适配执行必须成功退出 (RC=0)" "0" "$RC_2"

assert_file_exists "根目录必存在 AGENTS.md" "$TMP_DIR_2/AGENTS.md"
assert_dir_exists ".omp/agents 目录必存在" "$TMP_DIR_2/.omp/agents"
OMP_AGENTS_COUNT=0
if [ -d "$TMP_DIR_2/.omp/agents" ]; then
  OMP_AGENTS_COUNT=$(ls -1 "$TMP_DIR_2/.omp/agents"/spec-*.md 2>/dev/null | wc -l || true)
fi
assert_eq ".omp/agents 下必须有 7 个适配角色文件" "7" "$OMP_AGENTS_COUNT"
assert_file_not_exists "OMP 原生发现下不得生成冗余软链接 .omp/skills" "$TMP_DIR_2/.omp/skills"
assert_dir_exists ".agents/roles 中立角色目录必须存在" "$TMP_DIR_2/.agents/roles"
rm -rf "$TMP_DIR_2"

# ------------------------------------------------------------------------------
# Test 3: Claude 按需适配 (--runtime claude)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-03] 场景 3: Claude 按需适配 (--runtime claude)"
TMP_DIR_3="$(mktemp -d /tmp/test-scaffold-claude-XXXXXX)"
(
  cd "$TMP_DIR_3"
  bash "$SCRIPT_PATH" "$TMP_DIR_3" --runtime claude >/dev/null 2>&1
)
RC_3=$?
assert_eq "Claude 适配执行必须成功退出 (RC=0)" "0" "$RC_3"

assert_file_exists "根目录必存在 AGENTS.md" "$TMP_DIR_3/AGENTS.md"
assert_dir_exists ".claude/agents 目录必存在" "$TMP_DIR_3/.claude/agents"
assert_file_exists ".claude/skills 软链接必存在" "$TMP_DIR_3/.claude/skills/README.md"
rm -rf "$TMP_DIR_3"

# ------------------------------------------------------------------------------
# Test 4: Codex 按需适配 (--runtime codex)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-04] 场景 4: Codex 按需适配 (--runtime codex)"
TMP_DIR_4="$(mktemp -d /tmp/test-scaffold-codex-XXXXXX)"
(
  cd "$TMP_DIR_4"
  bash "$SCRIPT_PATH" "$TMP_DIR_4" --runtime codex >/dev/null 2>&1
)
RC_4=$?
assert_eq "Codex 适配执行必须成功退出 (RC=0)" "0" "$RC_4"

assert_file_exists "根目录必存在 AGENTS.md" "$TMP_DIR_4/AGENTS.md"
assert_dir_exists ".codex/agents 目录必存在" "$TMP_DIR_4/.codex/agents"
CODEX_AGENTS_COUNT=0
if [ -d "$TMP_DIR_4/.codex/agents" ]; then
  CODEX_AGENTS_COUNT=$(ls -1 "$TMP_DIR_4/.codex/agents"/spec-*.toml 2>/dev/null | wc -l || true)
fi
assert_eq ".codex/agents 下必须有 7 个 toml 角色文件" "7" "$CODEX_AGENTS_COUNT"
assert_file_exists ".codex/config.toml 必须存在" "$TMP_DIR_4/.codex/config.toml"
assert_contains ".codex/config.toml 必须包含 [agents]" "$TMP_DIR_4/.codex/config.toml" "[agents]"
assert_file_exists ".codex/skills 软链接必存在" "$TMP_DIR_4/.codex/skills/README.md"
rm -rf "$TMP_DIR_4"

# ------------------------------------------------------------------------------
# Test 5: P0-1 预置普通物理目录与普通文件防护测试 (防静默嵌套与数据破坏)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-05] 场景 5: 预置普通目录与文件安全防护与备份 (P0-1/P0-3 验证)"
TMP_DIR_5="$(mktemp -d /tmp/test-scaffold-guard-XXXXXX)"
mkdir -p "$TMP_DIR_5/.claude/skills/mine"
echo "custom_skill_content" > "$TMP_DIR_5/.claude/skills/mine/SKILL.md"
echo "CRUCIAL_REPORT_FILE" > "$TMP_DIR_5/html-report"

(
  cd "$TMP_DIR_5"
  bash "$SCRIPT_PATH" "$TMP_DIR_5" --runtime claude >/dev/null 2>&1
)
RC_5=$?
assert_eq "预置文件/目录时脚手架仍须成功退出 (RC=0)" "0" "$RC_5"

assert_file_exists "预置真实目录必须被自动备份保护" "$(find "$TMP_DIR_5/.claude" -name "skills.bak-*" | head -n 1)/mine/SKILL.md"
assert_file_exists "预置普通文件必须被自动备份保护 (P0-3)" "$(find "$TMP_DIR_5" -name "html-report.bak-*" | head -n 1)"
assert_file_exists "正向 skills 软链接必须正确建立在 .claude/skills" "$TMP_DIR_5/.claude/skills/README.md"
assert_file_not_exists "不得产生嵌套软链接 .claude/skills/skills" "$TMP_DIR_5/.claude/skills/skills"
rm -rf "$TMP_DIR_5"

# ------------------------------------------------------------------------------
# Test 6: P1-1 运行时参数校验强失败测试 (Fail-Closed)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-06] 场景 6: 运行时参数校验 (Fail-Closed 验证)"
TMP_DIR_6="$(mktemp -d /tmp/test-scaffold-validate-XXXXXX)"

set +e
bash "$SCRIPT_PATH" "$TMP_DIR_6" --runtime INVALID_RUNTIME >/dev/null 2>&1
INVALID_RC=$?
assert_eq "传入无效运行时参数必须 exit != 0 强阻断" "1" "$INVALID_RC"

bash "$SCRIPT_PATH" "$TMP_DIR_6" --runtime=omp >/dev/null 2>&1
EQ_RC=$?
assert_eq "支持 --runtime=omp 等号传参并成功退出" "0" "$EQ_RC"
assert_dir_exists "--runtime=omp 等号传参必须成功生成 .omp/agents" "$TMP_DIR_6/.omp/agents"

# P1-2 测试: --skills-repo-url 参数校验
bash "$SCRIPT_PATH" "$TMP_DIR_6" --skills-repo-url >/dev/null 2>&1
URL_RC=$?
assert_eq "缺少 --skills-repo-url 参数值必须 exit 1 阻断" "1" "$URL_RC"
set +e
rm -rf "$TMP_DIR_6"

# ------------------------------------------------------------------------------
# Test 7: P0-1 生产回退路径测试 (模拟上游缺少 .agents/roles 时的兜底模板)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-07] 场景 7: 缺少中立角色源时的兜底机制 (P0-1 回退验证)"
TMP_DIR_7="$(mktemp -d /tmp/test-scaffold-fallback-XXXXXX)"
# 建立一个干净的假仓库，模拟缺少 .agents/roles 的老版本 master
FAKE_REPO="$(mktemp -d /tmp/fake-skills-repo-XXXXXX)"
(
  cd "$FAKE_REPO"
  git init -q -b master .
  mkdir -p .agents/rules html-report
  echo "# test" > README.md
  echo "# rule" > .agents/rules/spec-workflow.md
  git add . && git commit -q -m "fake master"
)

export SKILLS_REPO_URL="file://$FAKE_REPO"
(
  cd "$TMP_DIR_7"
  bash "$SCRIPT_PATH" "$TMP_DIR_7" >/dev/null 2>&1
)
RC_7=$?
assert_eq "兜底路径下脚手架仍须成功退出 (RC=0)" "0" "$RC_7"
assert_file_exists "兜底模式下必须生成 spec-executor.md" "$TMP_DIR_7/.agents/roles/spec-executor.md"
assert_contains "兜底 spec-executor 必须拥有正确的 required_skill: spec-execute" "$TMP_DIR_7/.agents/roles/spec-executor.md" "required_skill: spec-execute"
assert_contains "兜底 spec-executor 必须为完整定义 (含 inputs:)" "$TMP_DIR_7/.agents/roles/spec-executor.md" "inputs:"
assert_contains "兜底 spec-executor 必须为完整定义 (含 rules:)" "$TMP_DIR_7/.agents/roles/spec-executor.md" "rules:"
assert_contains "兜底 spec-ender 必须指向原位归档" "$TMP_DIR_7/.agents/roles/spec-ender.md" "in-place"
assert_file_exists "SCRIPT_DIR 回退必须提供 scripts/rk-awr-checkpoint.sh (消除生产 RC=127)" "$TMP_DIR_7/scripts/rk-awr-checkpoint.sh"
assert_file_exists "SCRIPT_DIR 回退必须提供 scripts/rk-awr-checkpoint.ps1" "$TMP_DIR_7/scripts/rk-awr-checkpoint.ps1"

# ------------------------------------------------------------------------------
# Test 8: curl | bash 孤立执行场景下纯骨架兜底测试 (真正覆盖 get_canonical_role_content)
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-08] 场景 8: curl | bash 单脚本孤立执行与纯骨架兜底验证 (TC-08)"
ISOLATED_DIR="$(mktemp -d /tmp/test-scaffold-isolated-XXXXXX)"
TMP_DIR_8="$(mktemp -d /tmp/test-scaffold-target8-XXXXXX)"
FAKE_REPO_8="$(mktemp -d /tmp/fake-skills-repo8-XXXXXX)"
(
  cd "$FAKE_REPO_8"
  git init -q -b master .
  mkdir -p .agents/rules html-report
  echo "# test" > README.md
  echo "# rule" > .agents/rules/spec-workflow.md
  git add . && git commit -q -m "fake master"
)

# 将脚本单独拷出，模拟 curl | bash 执行（此时 SCRIPT_DIR/../.agents/roles 不存在）
cp "$SCRIPT_PATH" "$ISOLATED_DIR/init-ai-workflow.sh"
chmod +x "$ISOLATED_DIR/init-ai-workflow.sh"

export SKILLS_REPO_URL="file://$FAKE_REPO_8"
(
  cd "$TMP_DIR_8"
  bash "$ISOLATED_DIR/init-ai-workflow.sh" "$TMP_DIR_8" >/dev/null 2>&1
)
RC_8=$?
assert_eq "单脚本孤立执行脚手架必须成功退出 (RC=0)" "0" "$RC_8"
assert_file_exists "孤立模式下必须生成 spec-executor.md" "$TMP_DIR_8/.agents/roles/spec-executor.md"
assert_contains "孤立骨架 spec-executor 必须拥有正确的 required_skill: spec-execute" "$TMP_DIR_8/.agents/roles/spec-executor.md" "required_skill: spec-execute"
assert_contains "孤立骨架 spec-executor 必须包含 inputs:" "$TMP_DIR_8/.agents/roles/spec-executor.md" "inputs:"
assert_contains "孤立骨架 spec-executor 必须包含 rules:" "$TMP_DIR_8/.agents/roles/spec-executor.md" "rules:"
assert_contains "孤立骨架 spec-ender 必须声明 in-place" "$TMP_DIR_8/.agents/roles/spec-ender.md" "in-place"

# ------------------------------------------------------------------------------
# Test 9: P0-1 .agents/skills 非 git 目录预置数据安全备份测试
# ------------------------------------------------------------------------------
echo ""
echo "▶ [TC-09] 场景 9: 非 Git .agents/skills 目录自动备份防护 (P0-1)"
TMP_DIR_9="$(mktemp -d /tmp/test-scaffold-skills-bak-XXXXXX)"
mkdir -p "$TMP_DIR_9/.agents/skills/sub"
echo "precious_my_notes" > "$TMP_DIR_9/.agents/skills/my-notes.md"
echo "precious_sub_data" > "$TMP_DIR_9/.agents/skills/sub/x.md"

export SKILLS_REPO_URL="file://$LOCAL_SKILLS_DIR"
(
  cd "$TMP_DIR_9"
  bash "$SCRIPT_PATH" "$TMP_DIR_9" >/dev/null 2>&1
)
RC_9=$?
assert_eq "预置非 Git skills 目录时脚手架仍须成功退出 (RC=0)" "0" "$RC_9"
assert_file_exists "非 Git skills 必须被自动备份保护 (.bak)" "$(find "$TMP_DIR_9/.agents" -name "skills.bak-*" | head -n 1)/my-notes.md"
assert_file_exists "子目录数据在备份中完整保留" "$(find "$TMP_DIR_9/.agents" -name "skills.bak-*" | head -n 1)/sub/x.md"
assert_file_exists "全新克隆的 skills 必须正常就位" "$TMP_DIR_9/.agents/skills/README.md"

# TC-09.2: 克隆失败时自动回滚还原既有数据测试
TMP_DIR_9_FAIL="$(mktemp -d /tmp/test-scaffold-rollback-XXXXXX)"
mkdir -p "$TMP_DIR_9_FAIL/.agents/skills/sub"
echo "original_notes" > "$TMP_DIR_9_FAIL/.agents/skills/my-notes.md"
echo "original_data" > "$TMP_DIR_9_FAIL/.agents/skills/sub/x.md"

(
  cd "$TMP_DIR_9_FAIL"
  bash "$SCRIPT_PATH" "$TMP_DIR_9_FAIL" --skills-repo-url "file:///non/existent/path/for/skills.git" >/dev/null 2>&1
)
RC_9_FAIL=$?
assert_eq "克隆失败时脚手架必须返回非零错误 (RC!=0)" "1" "$RC_9_FAIL"
assert_file_exists "克隆失败后原 my-notes.md 必须被自动回滚还原" "$TMP_DIR_9_FAIL/.agents/skills/my-notes.md"
assert_file_exists "克隆失败后原 sub/x.md 必须被自动回滚还原" "$TMP_DIR_9_FAIL/.agents/skills/sub/x.md"
assert_contains "还原后的内容必须完全一致" "$TMP_DIR_9_FAIL/.agents/skills/my-notes.md" "original_notes"
rm -rf "$TMP_DIR_9_FAIL"
rm -rf "$TMP_DIR_9"
rm -rf "$ISOLATED_DIR" "$TMP_DIR_8" "$FAKE_REPO_8"
rm -rf "$TMP_DIR_7" "$FAKE_REPO"

echo ""
echo "================================================================="
echo "📊 测试统计结果: PASS=$PASS_COUNT, FAIL=$FAIL_COUNT"
echo "================================================================="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
else
  exit 0
fi
