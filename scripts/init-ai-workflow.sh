#!/usr/bin/env bash
# ==============================================================================
# Enterprise AI Coding Workflow 一键初始化脚本
# 基于 R&K Flow 规范 (HHU3637kr/skills) 与 AWR (Agent Work Runtime ≥0.5.0)
# CLI 中立架构：根目录 AGENTS.md + .agents/roles/ 权威源 + 参数化运行时适配
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"
SKILLS_REPO_URL="${SKILLS_REPO_URL:-https://github.com/HHU3637kr/skills.git}"
RUNTIME="none"
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime)
      if [ $# -lt 2 ]; then
        echo "❌ 错误: --runtime 需要一个参数 (none|omp|claude|codex)" >&2
        exit 1
      fi
      RUNTIME="$2"
      shift 2
      ;;
    --runtime=*)
      RUNTIME="${1#*=}"
      shift 1
      ;;
    --skills-repo-url)
      if [ $# -lt 2 ]; then
        echo "❌ 错误: --skills-repo-url 需要一个参数" >&2
        exit 1
      fi
      SKILLS_REPO_URL="$2"
      shift 2
      ;;
    --skills-repo-url=*)
      SKILLS_REPO_URL="${1#*=}"
      shift 1
      ;;
    -*)
      echo "❌ 错误: 未知选项: $1" >&2
      exit 1
      ;;
    *)
      if [ -z "$TARGET_DIR" ]; then
        TARGET_DIR="$1"
      fi
      shift 1
      ;;
  esac
done

# 运行时参数强校验 (Fail-Closed)
case "$RUNTIME" in
  none|omp|claude|codex) ;;
  *)
    echo "❌ 错误: 无效的运行时 '$RUNTIME'，有效选项: none, omp, claude, codex" >&2
    exit 1
    ;;
esac

TARGET_DIR="${TARGET_DIR:-$PWD}"
mkdir -p "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
PROJECT_NAME="$(basename "$TARGET_DIR")"

echo "================================================================="
echo " 🚀 初始化企业 AI Coding 规范体系 (CLI 中立架构)"
echo " 目标目录: $TARGET_DIR"
echo " 项目名称: $PROJECT_NAME"
echo " Skills源: $SKILLS_REPO_URL"
echo " 运行时:   $RUNTIME"
echo "================================================================="

# 1. 前置依赖检查
command -v git >/dev/null 2>&1 || { echo "❌ 错误: 未安装 git 命令"; exit 1; }

HAS_AWR=true
command -v awr >/dev/null 2>&1 || {
    HAS_AWR=false
    echo "⚠️ 提示: 系统尚未检测到 awr 命令 (建议全局安装最新版: npm install -g @originoneai/agent-work-runtime@latest 或 cargo install)"
}

cd "$TARGET_DIR"

# 2. 检查或初始化 Git 仓库
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "📦 正在初始化 Git 仓库 (默认分支: dev)..."
    git init -b dev
fi

# 3. 克隆或增量拉取 Skills 规范库
echo "📥 正在配置 Skills 依赖库 (.agents/skills)..."
mkdir -p .agents
if [ -d ".agents/skills/.git" ]; then
    echo "🔄 .agents/skills 已存在且为 Git 仓库，执行增量更新..."
    git -C .agents/skills pull --ff-only || true
else
    SKILLS_BAK=""
    if [ -e ".agents/skills" ]; then
        SKILLS_BAK=".agents/skills.bak-$(date +%Y%m%d-%H%M%S)"
        echo "⚠️ 警告: 检测到 .agents/skills 已存在但不是 Git 仓库，正在安全备份至 $SKILLS_BAK..."
        mv .agents/skills "$SKILLS_BAK"
    fi
    if ! git clone --depth=1 "$SKILLS_REPO_URL" .agents/skills; then
        echo "❌ 错误: 克隆规范库失败: $SKILLS_REPO_URL" >&2
        if [ -n "$SKILLS_BAK" ] && [ -e "$SKILLS_BAK" ]; then
            echo "🔄 正在自动回滚还原既有 .agents/skills..." >&2
            rm -rf .agents/skills 2>/dev/null || true
            mv "$SKILLS_BAK" .agents/skills
        fi
        exit 1
    fi
fi

# 4. 建立通用共享报告样式资产 (html-report)
echo "🔗 正在创建 HTML 报告样式资产联接..."
IS_WINDOWS_BASH=false
case "$(uname -s 2>/dev/null || true)" in
    CYGWIN*|MINGW*|MSYS*) IS_WINDOWS_BASH=true ;;
esac

create_symlink_or_junction() {
    local link_path="$1"
    local target_path="$2"

    # 严格安全防护：若目标为普通物理文件或目录，自动时间戳重命名备份，防破坏既有数据或产生嵌套软链接
    if [ -e "$link_path" ] && [ ! -L "$link_path" ]; then
        local backup_path="${link_path}.bak-$(date +%Y%m%d-%H%M%S)"
        echo "⚠️ 警告: 检测到 $link_path 为普通物理文件/目录，正在安全备份至 $backup_path..."
        mv "$link_path" "$backup_path"
    fi

    # 若已是软链接/Junction，先删除再建立，避免 ln -sfn 在目标存在时在内部创建嵌套链接
    if [ -L "$link_path" ]; then
        rm -f "$link_path" 2>/dev/null || true
    fi

    if [ "$IS_WINDOWS_BASH" = true ] && command -v cmd.exe >/dev/null 2>&1; then
        rm -rf "$link_path" 2>/dev/null || true
        local win_link
        local win_target
        win_link="$(echo "$link_path" | sed 's/\//\\/g')"
        win_target="$(echo "$target_path" | sed 's/\//\\/g')"
        cmd.exe /c "mklink /J $win_link $win_target" >/dev/null 2>&1 || ln -sfn "$target_path" "$link_path"
    else
        ln -sfn "$target_path" "$link_path"
    fi
}

create_symlink_or_junction "html-report" ".agents/skills/html-report"

# 5. 落地项目级企业治理规则 (.agents/rules/)
echo "📜 正在固化企业治理规则 (.agents/rules/)..."
mkdir -p .agents/rules
if [ -d ".agents/skills/.agents/rules" ]; then
    cp -rn .agents/skills/.agents/rules/* .agents/rules/ 2>/dev/null || cp -r .agents/skills/.agents/rules/* .agents/rules/
fi

# 6. 落地 CLI 中立角色权威定义 (.agents/roles/)
echo "🎭 正在固化 CLI 中立角色权威定义 (.agents/roles/)..."
mkdir -p .agents/roles
if [ -d ".agents/skills/.agents/roles" ]; then
    cp -rn .agents/skills/.agents/roles/* .agents/roles/ 2>/dev/null || cp -r .agents/skills/.agents/roles/* .agents/roles/
elif [ -n "${SCRIPT_DIR:-}" ] && [ -d "$SCRIPT_DIR/../.agents/roles" ]; then
    cp -rn "$SCRIPT_DIR/../.agents/roles"/* .agents/roles/ 2>/dev/null || cp -r "$SCRIPT_DIR/../.agents/roles"/* .agents/roles/
fi

get_canonical_role_content() {
    local role="$1"
    local skill
    case "$role" in
        spec-explorer) skill="spec-explore" ;;
        spec-writer)   skill="spec-write" ;;
        spec-tester)   skill="spec-test" ;;
        spec-executor) skill="spec-execute" ;;
        spec-debugger) skill="spec-debug" ;;
        spec-reviewer) skill="spec-review" ;;
        spec-ender)    skill="spec-end" ;;
        *) skill="$role" ;;
    esac
    local in_place_output=""
    if [ "$role" = "spec-ender" ]; then
        in_place_output="  - in-place archived Spec directory"
    fi
    cat << EOF
---
role_id: $role
required_skill: $skill
purpose: R&K Flow $role 专职角色定义
activation: TeamLead 按阶段流转驱动
communication: TeamLead-mediated
inputs:
  - task_description
  - spec_dir
outputs:
  - status
$in_place_output
handoff:
  to: TeamLead
rules:
  - 遵循 R&K Flow 对应 Skill 规约执行。
---

# $role

负责 R&K Flow 工作流中 $role 阶段的职责履行与产物交付。
EOF
}

ROLES=(spec-explorer spec-writer spec-tester spec-executor spec-debugger spec-reviewer spec-ender)
for role in "${ROLES[@]}"; do
    role_file=".agents/roles/${role}.md"
    if [ ! -f "$role_file" ]; then
        get_canonical_role_content "$role" > "$role_file"
    fi
done

# 6.1 固化 AWR 检查点自动化脚本 (scripts/rk-awr-checkpoint.{sh,ps1})
mkdir -p scripts
if [ -f ".agents/skills/scripts/rk-awr-checkpoint.sh" ]; then
    cp -f ".agents/skills/scripts/rk-awr-checkpoint.sh" scripts/rk-awr-checkpoint.sh
elif [ -n "${SCRIPT_DIR:-}" ] && [ -f "$SCRIPT_DIR/rk-awr-checkpoint.sh" ]; then
    cp -f "$SCRIPT_DIR/rk-awr-checkpoint.sh" scripts/rk-awr-checkpoint.sh
fi
chmod +x scripts/rk-awr-checkpoint.sh 2>/dev/null || true

if [ -f ".agents/skills/scripts/rk-awr-checkpoint.ps1" ]; then
    cp -f ".agents/skills/scripts/rk-awr-checkpoint.ps1" scripts/rk-awr-checkpoint.ps1
elif [ -n "${SCRIPT_DIR:-}" ] && [ -f "$SCRIPT_DIR/rk-awr-checkpoint.ps1" ]; then
    cp -f "$SCRIPT_DIR/rk-awr-checkpoint.ps1" scripts/rk-awr-checkpoint.ps1
fi

# 7. 生成标准根入口 (AGENTS.md)
if [ ! -f "AGENTS.md" ]; then
    echo "📝 正在生成标准薄入口 (AGENTS.md)..."
    cat << EOF > AGENTS.md
# $PROJECT_NAME — 项目约定

## 项目身份
- **类型**: 企业应用服务
- **运行时**: CLI 中立 (支持 OMP / Claude Code / Codex) + AWR (Agent Work Runtime ≥0.5.0)
- **版本控制**: \`dev + release\` 分支流（PR/MR 审查）

## 规则与技能导入
@import .agents/rules/
@import .agents/skills/

## 文档与架构规约
- **三级架构规范**：遵循 R&K Flow「项目 → Version → Spec」三级架构（详见 \`.agents/rules/spec-workflow.md\`）。
  - 角色定义权威源：\`.agents/roles/\`
  - 版本空间：\`spec/versions/<version>/\`
  - 经验知识库：\`spec/context/experience/\` 与 \`spec/context/knowledge/\`
- **阶段与提交门禁**：
  - \`spec → plan → 执行\`，每个阶段边界必须取得人的确认；\`git commit\`、\`git push\`、开 MR 一律先经人确认。
EOF
fi

# 8. 按需生成单一运行时适配 (<runtime>)
case "$RUNTIME" in
    omp)
        echo "⚙️ 正在装配 OMP 运行时专属适配 (.omp/agents/)..."
        mkdir -p .omp/agents
        for role in "${ROLES[@]}"; do
            omp_file=".omp/agents/${role}.md"
            if [ ! -f "$omp_file" ]; then
                cat << EOF > "$omp_file"
---
name: $role
description: R&K Flow $role 角色 OMP 适配
thinkingLevel: high
spawns: ""
---

You are $role in the R&K Flow Spec workflow.
Read \`.agents/roles/${role}.md\` and follow the referenced protocol.
Return results to TeamLead only, with artifact paths and any requested downstream handoff.
EOF
            fi
        done
        # OMP 原生通过 enableAgentsProject 发现 .agents/skills/，绝不创建冗余的 .omp/skills 软链接
        ;;
    claude)
        echo "⚙️ 正在装配 Claude Code 运行时专属适配 (.claude/)..."
        mkdir -p .claude/agents
        create_symlink_or_junction ".claude/skills" "../.agents/skills"
        for role in "${ROLES[@]}"; do
            claude_file=".claude/agents/${role}.md"
            if [ ! -f "$claude_file" ]; then
                cat << EOF > "$claude_file"
---
name: $role
description: R&K Flow $role 角色 Claude Code 适配
---

You are $role in the R&K Flow Spec workflow.
First read \`.agents/roles/${role}.md\` for your authoritative role definition and rules.
EOF
            fi
        done
        ;;
    codex)
        echo "⚙️ 正在装配 Codex 运行时专属适配 (.codex/)..."
        mkdir -p .codex/agents
        create_symlink_or_junction ".codex/skills" "../.agents/skills"
        if [ ! -f ".codex/config.toml" ]; then
            cat << EOF > .codex/config.toml
[agents]
max_threads = 7
max_depth = 1
EOF
        fi
        for role in "${ROLES[@]}"; do
            codex_name="${role//-/_}"
            codex_file=".codex/agents/${role}.toml"
            if [ ! -f "$codex_file" ]; then
                cat << EOF > "$codex_file"
name = "$codex_name"
description = "R&K Flow $role 角色 Codex 适配"
developer_instructions = """
You are $role in the R&K Flow Spec workflow.
First read \`.agents/roles/${role}.md\` for your authoritative role definition and rules.
"""
EOF
            fi
        done
        ;;
    none|*)
        echo "ℹ️ 运行模式保持纯中立 (none)，未生成任何特定客户端适配目录。"
        ;;
esac

# 9. 搭建三级架构空间与经验知识库
echo "🏗️ 正在构建三级架构与经验库骨架 (spec/)..."
mkdir -p spec/versions spec/context/experience spec/context/knowledge

if [ ! -f "spec/versions/README.md" ]; then
    cat << EOF > spec/versions/README.md
# 架构与版本空间 (Versions Space)
遵循 R&K Flow 三级架构（\`Project → Version → Spec\`），后续版本规划与 Spec 均在此目录下建立。
EOF
fi

if [ ! -f "spec/context/experience/index.md" ]; then
    cat << EOF > spec/context/experience/index.md
# 经验记忆索引 (Experience Index)
记录开发中沉淀的重大「困境-策略对」经验。每次开始复杂任务前，由 \`exp-search\` 先读本表，命中后再按需加载对应详情文件。

| ID | 标题 | 关键词 | 适用场景 | 一句话策略 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| EXP-001 | 占位示例 | 经验, 样例 | 项目初始化 | 遇到复杂技术陷阱时通过 exp-reflect 沉淀到此处 | - |
EOF
fi

if [ ! -f "spec/context/knowledge/index.md" ]; then
    cat << EOF > spec/context/knowledge/index.md
# 知识记忆索引 (Knowledge Index)
记录项目全局架构、核心数据流分析与重大技术调研结论。

| ID | 标题 | 类型 | 关键词 | 一句话概述 | 详情文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| KNOW-001 | 系统核心架构与数据流 | 项目理解 | 架构, 数据流 | 系统端到端核心数据流转链路说明 | - |
EOF
fi

# 10. 基础目标与工作台账 (AWR 核心源)
if [ ! -f "GOALS.md" ]; then
    cat << EOF > GOALS.md
# Project goal {#intake-goal status=active}

$PROJECT_NAME 业务开发、特性演进与代码质量保障。
- **范围**：核心业务模块及相关接口。
- **验收准则**：系统架构稳定，代码规范统一，功能满足业务诉求。
EOF
fi

if [ ! -f "work-ledger.yaml" ]; then
    cat << EOF > work-ledger.yaml
work_items:
  - id: INTAKE-001
    kind: intake
    title: 核实项目目标、现状与下一步交付
    status: ready
    goal: "goal#intake-goal"
    priority: P0
    required: true
    depends_on: []
    acceptance:
      - 逐项确认目标、已有实现、未完成工作和阻塞，保留来源引用。
      - 将不能确定的进度标记待核实，形成下一项可执行工作的验收条件。
    next_action: 运行 awr intake inspect，按缺项读取原始资料；补齐目标引用、验收和下一步后再次复检。
    summary: 这是新建的接入工作；不代表已有项目功能尚未实现或已经通过验收。
EOF
fi

# 11. 配置与初始化 AWR 运行时
if [ "$HAS_AWR" = true ]; then
    echo "⚙️ 正在初始化 AWR 运行时状态机..."
    mkdir -p .awr
    TMP_MANIFEST="$(mktemp /tmp/awr-manifest-XXXXXX.toml)"
    cat << EOF > "$TMP_MANIFEST"
[project]
name = "$PROJECT_NAME"
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

[[sources]]
domain = "rules"
role = "primary"
path = ".agents/rules/spec-workflow.md"
adapter = "markdown-rules-v1"
[sources.options]
severity = "soft"
scope = "project"
value = "*"
EOF
    if [ ! -f ".awr/project.toml" ]; then
        if ! awr init --project . --manifest "$TMP_MANIFEST" --accept; then
            echo "❌ 错误: AWR 项目初始化失败，请检查上方输出排障" >&2
            rm -f "$TMP_MANIFEST"
            exit 1
        fi
    fi
    rm -f "$TMP_MANIFEST"
    if ! awr source reindex; then
        echo "❌ 错误: AWR 源索引 (reindex) 失败，请检查源文件语法" >&2
        exit 1
    fi
fi
# 12. 更新 .gitignore（幂等）
echo "🛡️ 正在更新 .gitignore 过滤规则..."
touch .gitignore
if ! grep -qF "# AI Coding Workflow 忽略规则" .gitignore; then
    cat << 'EOF' >> .gitignore

# ==============================================================================
# AI Coding Workflow 忽略规则
# ==============================================================================
# AWR 本地运行时状态数据库
.awr/state.db
.awr/state.db-*
.awr/artifacts/
.awr/mutations/
.awr/cache/
.awr/clients/
.awr/executions/
.awr-backups/
*.bak-*

# Skills 单版本源与共享样式
.agents/skills/
html-report

# 本地 Agent 客户端私有适配（按需本地生成，不污染团队仓库）
.omp/
.claude/
.codex/
EOF
fi
echo "================================================================="
echo " 🎉 AI Coding 工作流初始化成功！(CLI 中立架构)"
echo " 已就绪组件:"
echo "  - 通用薄入口:     AGENTS.md"
echo "  - 企业治理规范:   .agents/rules/"
echo "  - 中立角色权威源: .agents/roles/"
echo "  - 规范库依赖:     .agents/skills/"
echo "  - 三级架构空间:   spec/versions/ & spec/context/"
echo "  - AWR 目标与台账: GOALS.md & work-ledger.yaml"
echo "  - 客户端适配模式: $RUNTIME"
echo "================================================================="
