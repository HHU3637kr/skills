#!/usr/bin/env bash
set -euo pipefail

TEST_TMP="$(mktemp -d /tmp/test-shallow-XXXXXX)"
trap 'rm -rf "$TEST_TMP"' EXIT

# 1. 创建本地模拟远程 skills 仓库，包含 3 次提交
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

# 2. 调用当前的 init-ai-workflow.sh (基于项目根目录)
REPO_ROOT="/home/WorkSpace/zhpj-server/.agents/skills"
export SKILLS_REPO_URL="file://$REMOTE_REPO"

bash "$REPO_ROOT/scripts/init-ai-workflow.sh" "$TARGET_PROJECT"

# 3. 验证是否为浅克隆
COMMIT_COUNT=$(git -C "$TARGET_PROJECT/.agents/skills" rev-list --count HEAD)
IS_SHALLOW=false
if [ -f "$TARGET_PROJECT/.agents/skills/.git/shallow" ]; then
    IS_SHALLOW=true
fi

echo "--- Test Output ---"
echo "Commit count in .agents/skills: $COMMIT_COUNT"
echo "Is shallow repository: $IS_SHALLOW"

if [ "$COMMIT_COUNT" -eq 1 ] && [ "$IS_SHALLOW" = "true" ]; then
    echo "PASS: Shallow clone verified (depth=1)."
    exit 0
else
    echo "FAIL: Expected shallow clone with 1 commit, got $COMMIT_COUNT commits (is_shallow=$IS_SHALLOW)."
    exit 1
fi
