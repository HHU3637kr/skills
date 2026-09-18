#!/usr/bin/env bash
set -euo pipefail

TEST_TMP="$(mktemp -d /tmp/test-shallow-e2e-XXXXXX)"
trap 'rm -rf "$TEST_TMP"' EXIT

echo "=== 1. 构建模拟远程仓库 (具有多提交历史) ==="
REMOTE_REPO="$TEST_TMP/mock-skills-remote"
mkdir -p "$REMOTE_REPO"
git init -b master "$REMOTE_REPO"
git -C "$REMOTE_REPO" config user.name "Tester"
git -C "$REMOTE_REPO" config user.email "tester@example.com"
echo "Commit 1" > "$REMOTE_REPO/file1.txt"
git -C "$REMOTE_REPO" add . && git -C "$REMOTE_REPO" commit -m "commit 1"
echo "Commit 2" > "$REMOTE_REPO/file2.txt"
git -C "$REMOTE_REPO" add . && git -C "$REMOTE_REPO" commit -m "commit 2"
echo "Commit 3" > "$REMOTE_REPO/file3.txt"
git -C "$REMOTE_REPO" add . && git -C "$REMOTE_REPO" commit -m "commit 3"

TARGET_PROJECT="$TEST_TMP/target-project"
mkdir -p "$TARGET_PROJECT"

echo "=== 2. 运行修改后的 init-ai-workflow.sh ==="
REPO_ROOT="/home/WorkSpace/zhpj-server/.agents/skills"
export SKILLS_REPO_URL="file://$REMOTE_REPO"

bash "$REPO_ROOT/scripts/init-ai-workflow.sh" "$TARGET_PROJECT"

echo "=== 3. 验证浅克隆属性 (GREEN) ==="
COMMIT_COUNT=$(git -C "$TARGET_PROJECT/.agents/skills" rev-list --count HEAD)
IS_SHALLOW=false
if [ -f "$TARGET_PROJECT/.agents/skills/.git/shallow" ]; then
    IS_SHALLOW=true
fi
echo "Commit count in .agents/skills: $COMMIT_COUNT"
echo "Is shallow repository: $IS_SHALLOW"

if [ "$COMMIT_COUNT" -ne 1 ] || [ "$IS_SHALLOW" != "true" ]; then
    echo "❌ 失败: 期望提交数为 1 且包含 shallow 文件，实际 count=$COMMIT_COUNT is_shallow=$IS_SHALLOW"
    exit 1
fi
echo "✅ 成功: 首次执行成功完成浅克隆 (depth=1)"

echo "=== 4. 验证增量拉取能力 (git pull --ff-only) ==="
echo "Commit 4 (新上游提交)" > "$REMOTE_REPO/file4.txt"
git -C "$REMOTE_REPO" add . && git -C "$REMOTE_REPO" commit -m "commit 4"

# 再次运行初始化脚本，走 else 之外的增量 pull 分支
bash "$REPO_ROOT/scripts/init-ai-workflow.sh" "$TARGET_PROJECT"

COMMIT_COUNT_AFTER=$(git -C "$TARGET_PROJECT/.agents/skills" rev-list --count HEAD)
echo "Commit count after incremental pull: $COMMIT_COUNT_AFTER"
if [ ! -f "$TARGET_PROJECT/.agents/skills/file4.txt" ]; then
    echo "❌ 失败: 增量拉取后未获取到 file4.txt"
    exit 1
fi
echo "✅ 成功: 浅克隆后执行增量更新 (pull --ff-only) 完美兼容且新提交成功合入！"

echo "=== ALL TESTS PASSED ==="
