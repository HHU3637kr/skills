#!/usr/bin/env bash
# ==============================================================================
# R&K Flow -> AWR 0.5.0 会话检查点记录辅助工具
# 解决各角色在阶段交接时无法获取 Session ID 与 CAS 锁版本的问题
# 具备多级降级支持：优先 python3，次选 jq，纯 POSIX (awk/sed/grep) 彻底支持 Git Bash
# ==============================================================================
set -euo pipefail
WORK=""
AGENT=""
DIGEST=""
NEXT_ACTION=""
OPEN_LOOP=""
END_SESSION=false
START_ERR_FILE=""
RESUME_ERR_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --work) WORK="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    --digest) DIGEST="$2"; shift 2 ;;
    --next-action) NEXT_ACTION="$2"; shift 2 ;;
    --open-loop) OPEN_LOOP="$2"; shift 2 ;;
    --end) END_SESSION=true; shift 1 ;;
    *)
      echo "❌ 错误: 未知参数 '$1'"
      echo "用法: $0 --work <SPEC-ID> --agent <ROLE> --digest \"<本次完成简述>\" [--next-action \"<下一步>\"] [--open-loop \"<未决事项>\"] [--end]"
      exit 1
      ;;
  esac
done

if ! command -v awr >/dev/null 2>&1; then
  echo "⚠️ awr 未安装，跳过会话检查点记录"
  exit 0
fi

if [ -z "$WORK" ] || [ -z "$AGENT" ] || [ -z "$DIGEST" ]; then
  echo "❌ 错误: --work, --agent, --digest 为必填参数"
  echo "用法: $0 --work <SPEC-ID> --agent <ROLE> --digest \"<本次完成简述>\" [--next-action \"<下一步>\"] [--open-loop \"<未决事项>\"] [--end]"
  exit 1
fi

# 向上定位最近的 AWR 项目根目录（包含 .awr/project.toml），支持 monorepo 与深层子目录执行
find_awr_project_root() {
  local d="$PWD"
  while [ "$d" != "/" ] && [ "$d" != "." ]; do
    if [ -f "$d/.awr/project.toml" ]; then
      printf "%s" "$d"
      return 0
    fi
    d="$(dirname "$d")"
  done
  # 未找到则返回当前目录，交由后续 awr status 报错
  printf "%s" "$PWD"
}

AWR_ROOT="$(find_awr_project_root)"
cd "$AWR_ROOT"

extract_json_field() {
  local field="$1"
  local input
  input="$(cat)"

  if command -v python3 >/dev/null 2>&1; then
    local py_res
    py_res=$(printf "%s" "$input" | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    cur = data
    for part in '$field'.split('.'):
        if not part: continue
        if isinstance(cur, dict): cur = cur.get(part)
        else: cur = None; break
    if cur is not None and not isinstance(cur, (dict, list)):
        print(cur)
except Exception:
    pass" 2>/dev/null || true)
    if [ -n "$py_res" ]; then
      printf "%s" "$py_res"
      return
    fi
  fi

  if command -v jq >/dev/null 2>&1; then
    local jq_res
    jq_res=$(printf "%s" "$input" | jq -r ".$field // empty" 2>/dev/null || true)
    if [ -n "$jq_res" ]; then
      printf "%s" "$jq_res"
      return
    fi
  fi

  case "$field" in
    project_revision)
      printf "%s" "$input" | grep -o '"project_revision":[[:space:]]*[0-9]*' | head -n 1 | awk -F: '{gsub(/[[:space:]]/,"",$2); print $2}' || true
      ;;
    "work_context.context_hash"|context_hash)
      # 权威 context_hash 恒为 64 位十六进制字符串，定长匹配避免任何字母子串误判与括号截断陷阱
      val=$(printf "%s" "$input" | awk -F'"' '/"work_context"[[:space:]]*:/ { in_wc = 1 } in_wc && /"context_hash"/ { for (i=1; i<=NF; i++) { if ($i ~ /^[0-9a-fA-F]{64}$/) { print $i; exit } } }' || true)
      if [ -z "$val" ]; then
        val=$(printf "%s" "$input" | grep -o '"context_hash":[[:space:]]*"[0-9a-fA-F]\{64\}"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true)
      fi
      printf "%s" "$val"
      ;;
    "checkpoint.id"|checkpoint_id)
      val=$(printf "%s" "$input" | grep -o '"checkpoint_id":[[:space:]]*"01[0-9A-Z]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true)
      if [ -z "$val" ]; then
        val=$(printf "%s" "$input" | awk '/"checkpoint":[[:space:]]*{/ {in_cp=1} in_cp && /"id":[[:space:]]*"01/ {match($0, /01[0-9A-Z]+/); print substr($0, RSTART, RLENGTH); exit}' || true)
      fi
      if [ -z "$val" ]; then
        val=$(printf "%s" "$input" | grep -o '"id":[[:space:]]*"01[0-9A-Z]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true)
      fi
      printf "%s" "$val"
      ;;
    "session.id"|session_id)
      val=$(printf "%s" "$input" | grep -o '"session_id":[[:space:]]*"01[0-9A-Z]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true)
      if [ -z "$val" ]; then
        val=$(printf "%s" "$input" | awk '/"session":[[:space:]]*{/ {in_ss=1} in_ss && /"id":[[:space:]]*"01/ {match($0, /01[0-9A-Z]+/); print substr($0, RSTART, RLENGTH); exit}' || true)
      fi
      if [ -z "$val" ]; then
        val=$(printf "%s" "$input" | grep -o '"id":[[:space:]]*"01[0-9A-Z]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true)
      fi
      printf "%s" "$val"
      ;;
    "work.id"|work_id)
      val=$(printf "%s" "$input" | awk '
        /"work":[[:space:]]*{/ { in_w = 1 }
        in_w && /"active_claims":[[:space:]]*\[[[:space:]]*\]/ { in_claims = 0; next }
        in_w && /"active_claims":[[:space:]]*\[/ { in_claims = 1 }
        in_claims && /^[[:space:]]*\][[:space:]]*,?[[:space:]]*$/ { in_claims = 0 }
        in_w && !in_claims && /"id":[[:space:]]*"01/ {
          match($0, /01[0-9A-Z]+/); print substr($0, RSTART, RLENGTH); exit
        }
      ' || true)
      if [ -z "$val" ]; then
        val=$(printf "%s" "$input" | grep -o '"work_item_id":[[:space:]]*"01[0-9A-Z]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true)
      fi
      printf "%s" "$val"
      ;;
    "work.status"|work_status)
      printf "%s" "$input" | grep -o '"status":[[:space:]]*"[^"]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true
      ;;
    "work.raw_status"|work_raw_status|raw_status)
      printf "%s" "$input" | grep -o '"raw_status":[[:space:]]*"[^"]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true
      ;;
    id)
      printf "%s" "$input" | grep -o '"id":[[:space:]]*"01[0-9A-Z]*"' | head -n 1 | awk -F'"' '{print $(NF-1)}' || true
      ;;
  esac
}
# 1. 获取当前 project_revision
STATUS_JSON=$(awr status --json 2>/dev/null || echo "{}")
REV=$(printf "%s" "$STATUS_JSON" | extract_json_field "project_revision")

if [ -z "$REV" ]; then
  echo "❌ 错误: 无法获取 AWR 项目版本号，请确认处于有效 AWR 项目根目录下"
  exit 1
fi

# 2. 获取当前工作项内部 ID 并查找匹配的活动会话（传 --active --limit 100 防分页截断）
WORK_SHOW=$(awr work show "$WORK" --json 2>/dev/null || echo "{}")
WORK_ULID=$(printf "%s" "$WORK_SHOW" | extract_json_field "work.id")

if [ -z "$WORK_ULID" ]; then
  echo "❌ 错误: 无法解析工作项 [$WORK] 的内部 ID，拒绝在未知工作项上执行会话接力或认领！" >&2
  exit 1
fi
SESSIONS_JSON=$(awr session list --active --limit 100 --json 2>/dev/null || echo "{}")
SESSION_ID=""

if command -v python3 >/dev/null 2>&1; then
  SESSION_ID=$(printf "%s" "$SESSIONS_JSON" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
    agent = sys.argv[1]
    wid = sys.argv[2]
    for s in d.get("sessions", []):
        if s.get("agent_id") == agent and s.get("status") == "active":
            swid = s.get("work_item_id")
            if (not wid and not swid) or (wid and swid == wid):
                print(s.get("id", ""))
                break
except Exception:
    pass' "$AGENT" "${WORK_ULID:-}")
elif command -v jq >/dev/null 2>&1; then
  SESSION_ID=$(printf "%s" "$SESSIONS_JSON" | jq -r --arg a "$AGENT" --arg wid "$WORK_ULID" '.sessions[]? | select(.agent_id == $a and .status == "active" and (($wid == "" and .work_item_id == null) or ($wid != "" and .work_item_id == $wid))) | .id' | head -n 1)
else
  # 纯 POSIX awk 从 JSON 数组块提取 active 会话
  SESSION_ID=$(printf "%s" "$SESSIONS_JSON" | awk -v agent="$AGENT" -v wid="$WORK_ULID" '
    /"agent_id":[[:space:]]*"/ { in_agent = (index($0, agent) > 0) }
    /"status":[[:space:]]*"active"/ { is_active = 1 }
    /"work_item_id":[[:space:]]*"/ { in_work = (wid == "" || index($0, wid) > 0) }
    /"id":[[:space:]]*"01/ {
      if (match($0, /01[0-9A-Z]+/)) {
        cur_id = substr($0, RSTART, RLENGTH)
      }
    }
    /}/ {
      if (in_agent && is_active && (wid == "" || in_work) && cur_id != "") {
        print cur_id
        exit
      }
      in_agent = 0; is_active = 0; in_work = 0; cur_id = ""
    }
  ')
fi
# 3. 检查会话建立方式：
# 若无本角色活跃会话，但存在属于该工作项的其他前驱活跃会话，自动通过 session resume 完成租约平滑转交（Claim Transfer）
# 若完全无前驱活跃会话，则通过 session start --claim 首发认领
if [ -z "$SESSION_ID" ]; then
  PREV_SESSION_ID=""
  if command -v python3 >/dev/null 2>&1; then
    PREV_SESSION_ID=$(printf "%s" "$SESSIONS_JSON" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
    wid = sys.argv[1]
    for s in d.get("sessions", []):
        if s.get("status") == "active":
            swid = s.get("work_item_id")
            if (not wid and not swid) or (wid and swid == wid):
                print(s.get("id", ""))
                break
except Exception:
    pass' "${WORK_ULID:-}")
  elif command -v jq >/dev/null 2>&1; then
    PREV_SESSION_ID=$(printf "%s" "$SESSIONS_JSON" | jq -r --arg wid "$WORK_ULID" '.sessions[]? | select(.status == "active" and (($wid == "" and .work_item_id == null) or ($wid != "" and .work_item_id == $wid))) | .id' | head -n 1)
  else
    # 纯 POSIX awk: 查找同工作项的任意活跃前驱会话进行接力
    PREV_SESSION_ID=$(printf "%s" "$SESSIONS_JSON" | awk -v wid="$WORK_ULID" '
      /"status":[[:space:]]*"active"/ { is_active = 1 }
      /"work_item_id":[[:space:]]*"/ { in_work = (wid != "" && index($0, wid) > 0) }
      /"id":[[:space:]]*"01/ {
        if (match($0, /01[0-9A-Z]+/)) {
          cur_id = substr($0, RSTART, RLENGTH)
        }
      }
      /}/ {
        if (is_active && ((wid == "" && !in_work) || (wid != "" && in_work)) && cur_id != "") {
          print cur_id
          exit
        }
        is_active = 0; in_work = 0; cur_id = ""
      }
    ')
  fi

  RESUME_ERR_FILE=$(mktemp 2>/dev/null || echo "/tmp/awr-resume-err-$$-${RANDOM:-0}")
  START_ERR_FILE=$(mktemp 2>/dev/null || echo "/tmp/awr-start-err-$$-${RANDOM:-0}")
  if [ -n "$PREV_SESSION_ID" ]; then
    # 自动走 resume 接力
    RESUME_OUT=$(awr session resume --from-session "$PREV_SESSION_ID" --work "$WORK" --agent "$AGENT" --provider omp --model default --claim --expected-revision "$REV" --json 2>"$RESUME_ERR_FILE" || true)
    SESSION_ID=$(printf "%s" "$RESUME_OUT" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("resumed", {}).get("session", {}).get("id") or d.get("session", {}).get("id") or "")
except Exception:
    pass' 2>/dev/null || true)
    [ -z "$SESSION_ID" ] && SESSION_ID=$(printf "%s" "$RESUME_OUT" | jq -r '.resumed.session.id // .session.id // empty' 2>/dev/null || true)
    [ -z "$SESSION_ID" ] && SESSION_ID=$(printf "%s" "$RESUME_OUT" | awk '
      /"resumed"[[:space:]]*:/ { in_resumed = 1 }
      in_resumed && /"session"[[:space:]]*:[[:space:]]*{/ { in_new_ss = 1 }
      in_new_ss && /"id"[[:space:]]*:[[:space:]]*"01/ {
        match($0, /01[0-9A-Z]+/)
        print substr($0, RSTART, RLENGTH)
        exit
      }
    ' || true)
  fi
  # 若有前驱会话但 resume 未取到 Session ID，说明接力彻底失败，绝不盲目降级走 session start（避免掩盖错误并引发 ClaimConflict）
  if [ -n "$PREV_SESSION_ID" ] && [ -z "$SESSION_ID" ]; then
    echo "❌ 错误: AWR 会话接力 (resume) 失败！" >&2
    if [ -s "$RESUME_ERR_FILE" ]; then
      echo "AWR 详情:" >&2
      cat "$RESUME_ERR_FILE" >&2
    fi
    rm -f "$RESUME_ERR_FILE" "$START_ERR_FILE"
    exit 1
  fi

  # 若完全无前驱会话，走首发 session start
  if [ -z "$SESSION_ID" ]; then
    START_RES=$(awr session start --work "$WORK" --agent "$AGENT" --provider omp --model default --claim --ttl-ms 3600000 --expected-revision "$REV" --json 2>"$START_ERR_FILE" || true)
    SESSION_ID=$(printf "%s" "$START_RES" | extract_json_field "session.id")
    [ -z "$SESSION_ID" ] && SESSION_ID=$(printf "%s" "$START_RES" | extract_json_field "session_id")
    [ -z "$SESSION_ID" ] && SESSION_ID=$(printf "%s" "$START_RES" | extract_json_field "id")
    NEW_REV=$(printf "%s" "$START_RES" | extract_json_field "project_revision")
    [ -n "$NEW_REV" ] && REV="$NEW_REV"
  fi
fi
if [ -z "$SESSION_ID" ]; then
  echo "❌ 错误: 无法获取、接力或启动 AWR 会话！" >&2
  if [ -n "$PREV_SESSION_ID" ] && [ -n "$RESUME_ERR_FILE" ] && [ -s "$RESUME_ERR_FILE" ]; then
    echo "AWR 接力 (resume) 详情:" >&2
    cat "$RESUME_ERR_FILE" >&2
  fi
  if [ -n "$START_ERR_FILE" ] && [ -s "$START_ERR_FILE" ]; then
    echo "AWR 启动 (session start) 详情:" >&2
    cat "$START_ERR_FILE" >&2
  fi
  [ -n "$RESUME_ERR_FILE" ] && rm -f "$RESUME_ERR_FILE"
  [ -n "$START_ERR_FILE" ] && rm -f "$START_ERR_FILE"
  exit 1
fi
[ -n "$RESUME_ERR_FILE" ] && rm -f "$RESUME_ERR_FILE"
[ -n "$START_ERR_FILE" ] && rm -f "$START_ERR_FILE"

# 4. 检查工作项状态：若为 ready，自动通过 awr work progress 推进至 in_progress (消灭 P0-1 状态机断裂)
# 执行前先现读刷新一次 REV，防止 resume 抬高了版本引发 RevisionConflict
FRESH_STATUS=$(awr status --json 2>/dev/null || echo "{}")
FRESH_REV=$(printf "%s" "$FRESH_STATUS" | extract_json_field "project_revision")
[ -n "$FRESH_REV" ] && REV="$FRESH_REV"

WORK_RAW_STATUS=$(printf "%s" "$WORK_SHOW" | extract_json_field "raw_status")
WORK_STATUS=$(printf "%s" "$WORK_SHOW" | extract_json_field "status")
if [ -z "$WORK_RAW_STATUS" ] || [ -z "$WORK_STATUS" ]; then
  if command -v python3 >/dev/null 2>&1; then
    WORK_STATUS_JSON=$(printf "%s" "$WORK_SHOW" | python3 -c 'import sys, json
try:
    w = json.load(sys.stdin).get("work", {})
    print(f"{w.get(\"raw_status\", \"\")}|{w.get(\"status\", \"\")}")
except Exception:
    pass' 2>/dev/null || true)
    [ -z "$WORK_RAW_STATUS" ] && WORK_RAW_STATUS="${WORK_STATUS_JSON%%|*}"
    [ -z "$WORK_STATUS" ] && WORK_STATUS="${WORK_STATUS_JSON##*|}"
  elif command -v jq >/dev/null 2>&1; then
    [ -z "$WORK_RAW_STATUS" ] && WORK_RAW_STATUS=$(printf "%s" "$WORK_SHOW" | jq -r '.work.raw_status // empty' 2>/dev/null || true)
    [ -z "$WORK_STATUS" ] && WORK_STATUS=$(printf "%s" "$WORK_SHOW" | jq -r '.work.status // empty' 2>/dev/null || true)
  fi
fi

if [ -z "$WORK_RAW_STATUS" ] && [ -z "$WORK_STATUS" ]; then
  echo "❌ 错误: 无法解析工作项 [$WORK] 的当前状态 (raw_status 与 status 均为空)，拒绝盲目执行！" >&2
  exit 1
fi

if [ "$WORK_RAW_STATUS" = "ready" ] || [ "$WORK_STATUS" = "ready" ]; then
  PROGRESS_ERR_FILE=$(mktemp 2>/dev/null || echo "/tmp/awr-progress-err-$$-${RANDOM:-0}")
  NEXT_ACTION_VAL="${NEXT_ACTION:-推进下一步工作}"
  if ! awr work progress "$WORK" --summary "开工推进：状态转入进行中" --next-action "$NEXT_ACTION_VAL" --session "$SESSION_ID" --reason "开工自动推进状态" --expected-revision "$REV" --json >/dev/null 2>"$PROGRESS_ERR_FILE"; then
    echo "❌ 错误: 自动推进工作项 [$WORK] 状态 (ready -> in_progress) 失败！" >&2
    [ -s "$PROGRESS_ERR_FILE" ] && cat "$PROGRESS_ERR_FILE" >&2
    rm -f "$PROGRESS_ERR_FILE"
    exit 1
  fi
  rm -f "$PROGRESS_ERR_FILE"
fi

# progress 推进后台账重写且 project_revision 递增，必须再次现读最新版本号
LATEST_STATUS=$(awr status --json 2>/dev/null || echo "{}")
LATEST_REV=$(printf "%s" "$LATEST_STATUS" | extract_json_field "project_revision")
[ -n "$LATEST_REV" ] && REV="$LATEST_REV"

# 6. 获取上下文哈希（必须传递 --session "$SESSION_ID" 防止多会话报错，且必须严查 compile 命令执行状态）
COMPILE_ERR_FILE=$(mktemp 2>/dev/null || echo "/tmp/awr-comp-err-$$-${RANDOM:-0}")
COMPILE_RC=0
COMPILE_OUT=$(awr context compile --work "$WORK" --session "$SESSION_ID" --budget 4000 --json 2>"$COMPILE_ERR_FILE") || COMPILE_RC=$?

if [ "$COMPILE_RC" -ne 0 ]; then
  echo "❌ 错误: AWR 上下文编译失败 (存在阻断缺口或不完整上下文，拒绝未认证盖章)！" >&2
  [ -s "$COMPILE_ERR_FILE" ] && cat "$COMPILE_ERR_FILE" >&2
  [ -n "$COMPILE_OUT" ] && echo "$COMPILE_OUT" >&2
  rm -f "$COMPILE_ERR_FILE"
  exit 1
fi

CTX_HASH=""
if command -v python3 >/dev/null 2>&1; then
  CTX_HASH=$(printf "%s" "$COMPILE_OUT" | python3 -c "import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('work_context', {}).get('context_hash') or '')
except Exception:
    pass" 2>/dev/null || true)
elif command -v jq >/dev/null 2>&1; then
  CTX_HASH=$(printf "%s" "$COMPILE_OUT" | jq -r '.work_context.context_hash // empty' 2>/dev/null || true)
fi

if [ -z "$CTX_HASH" ]; then
  CTX_HASH=$(printf "%s" "$COMPILE_OUT" | extract_json_field "work_context.context_hash")
fi

if [ -z "$CTX_HASH" ]; then
  echo "❌ 错误: 未能从 AWR 编译输出中获取官方权威 context_hash，拒绝提交伪造哈希！" >&2
  [ -s "$COMPILE_ERR_FILE" ] && cat "$COMPILE_ERR_FILE" >&2
  rm -f "$COMPILE_ERR_FILE"
  exit 1
fi
rm -f "$COMPILE_ERR_FILE"
# 7. 提交会话检查点
CHECKPOINT_ARGS=(
  --session "$SESSION_ID"
  --work "$WORK"
  --context-hash "$CTX_HASH"
  --digest "$DIGEST"
  --next-action "${NEXT_ACTION:-推进下一步}"
  --expected-revision "$REV"
)

if [ -n "$OPEN_LOOP" ]; then
  CHECKPOINT_ARGS+=(--open-loop "$OPEN_LOOP")
fi
CP_ERR_FILE=""
if command -v mktemp >/dev/null 2>&1; then
  CP_ERR_FILE=$(mktemp)
else
  CP_ERR_FILE="/tmp/awr-cp-err-$$-${RANDOM:-0}"
fi

if ! CP_OUT=$(awr session checkpoint "${CHECKPOINT_ARGS[@]}" --json 2>"$CP_ERR_FILE"); then
  echo "❌ 错误: AWR 会话检查点保存失败！"
  [ -s "$CP_ERR_FILE" ] && cat "$CP_ERR_FILE" >&2
  [ -n "$CP_OUT" ] && echo "$CP_OUT" >&2
  rm -f "$CP_ERR_FILE"
  exit 1
fi
rm -f "$CP_ERR_FILE"
CP_ID=$(printf "%s" "$CP_OUT" | extract_json_field "checkpoint.id")

if [ -z "$CP_ID" ]; then
  echo "❌ 错误: AWR 会话检查点响应未包含有效 checkpoint id！"
  echo "AWR 响应: $CP_OUT" >&2
  exit 1
fi

echo "✅ AWR 会话检查点保存成功: $CP_ID (Session: $SESSION_ID, Rev: $REV)"

# 8. 如果指定了 --end，正常关闭当前会话并显式释放租约（--outcome ended）
if [ "$END_SESSION" = true ]; then
  STATUS_END=$(awr status --json 2>/dev/null || echo "{}")
  CURR_REV=$(printf "%s" "$STATUS_END" | extract_json_field "project_revision")
  END_ERR_FILE=$(mktemp 2>/dev/null || echo "/tmp/awr-end-err-$$-${RANDOM:-0}")
  if ! awr session end --session "$SESSION_ID" --work "$WORK" --outcome ended --expected-revision "${CURR_REV:-$REV}" --json 2>"$END_ERR_FILE"; then
    echo "❌ 错误: AWR 会话关闭与租约释放失败 (Session: $SESSION_ID)！" >&2
    [ -s "$END_ERR_FILE" ] && cat "$END_ERR_FILE" >&2
    rm -f "$END_ERR_FILE"
    exit 1
  fi
  rm -f "$END_ERR_FILE"
  echo "🔒 已正常关闭 AWR 会话并释放租约: $SESSION_ID"
fi
