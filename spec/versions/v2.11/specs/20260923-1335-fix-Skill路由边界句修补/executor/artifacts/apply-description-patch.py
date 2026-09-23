#!/usr/bin/env python3
"""apply-description-patch.py — 应用 8 个 SKILL.md 的 description 边界句修补

- 只替换 frontmatter 中的 `description:` 块，其余字节保持原样。
- 新值为单行 plain scalar（与 spec-update / spec-review / exp-* 现有风格一致）。
- 应用后自带校验：frontmatter 可解析、name 不变、description ≤1024 字符。
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import yaml

PATCH: dict[str, str] = {
    "spec-test": (
        "当角色 spec-tester 需要为 Spec 撰写 tester/test-plan.html、在实现完成后执行测试并产出 tester/test-report.html，"
        "或在 spec-debugger 修复后重新验证时使用。若测试对象属于 Web 前端、端侧应用、API、CLI 等具体场景，"
        "先选择对应 references 测试策略。也用于核对用例与证据是否真跑过：校验测试是否在当前工作树实际运行、"
        "证据是否由测试运行自动生成（禁止事后手写补写）、识别假测试假绿与测试有效性、评估 spec-executor 的单元测试质量。"
        "不要用于普通代码实现、bug 修复，或审查实现是否符合 Spec（后者归 spec-review）。"
    ),
    "spec-review": (
        "审查 Spec 执行完成情况，检验实现是否严格按照 Spec 执行，识别未完成项和不符项，在 reviewer/ 下生成审查报告（review.html）。"
        "在 spec-execute 完成 executor/summary.html 后、spec-end 归档前使用。`gated` 模式下可选，由 TeamLead 按需启动；"
        "`autopilot` 模式下强制介入（自动驾驶下唯一的独立视角）。触发词：审查 Spec、检查实现、Spec Review。"
        "不要用于核对用例或证据是否真跑过、识别假测试与评估测试质量（归 spec-test），也不要用于运行期故障诊断与 bug 修复（归 spec-debug）。"
    ),
    "html-report": (
        "当需要产出或修改 R&K Flow 的 Spec 报告（exploration-report / plan / test-plan / test-report / summary / debug / "
        "review / update / end-report）的格式时使用。定义 HTML 报告的固定结构、固定样式和可追溯修订标记规范。"
        "典型信号：要写某个 Spec 阶段的报告骨架、要修订已有报告、要让用户看清两版之间改了什么、"
        "或要核对修订号/修订历史/meta/双向关联/样式表是否符合契约。本 Skill 只规定'报告长什么样'，不决定'报告里写什么'："
        "补漏需求参数、改方案、调整验收标准、修结论、补修订历史内容分别属于 spec-update / spec-write / spec-execute 等角色 Skill，"
        "它们只在需要遵守格式契约时读本 Skill。请求里出现 report/plan/update 等文件名不构成本 Skill 的触发条件。"
        "不要用于记忆库文件（`spec/context/**/*.md`，保持 Markdown 供 `exp-search` 检索）。"
    ),
    "spec-update": (
        "当同一个活跃 Spec（位于 `spec/versions/<version>/specs/<spec-dir>/`）在当前工作分支内需要小迭代、补充需求、"
        "修正方案或优化实现，且原 Spec 目录已有 writer/plan.html + executor/summary.html 时使用。"
        "典型信号：'改 writer/plan.html 里漏掉的分页参数''补一条原 Spec 没覆盖的需求''修 update 方案里写错的验收标准'、"
        "修订既有 writer/plan.html / executor/summary.html、给已有报告递增修订号并补修订历史行"
        "（5 列格式与 `<ins>/<del>` 标记规则由 html-report 定义，写什么内容、为什么归本 Skill）"
        "——只要动的是报告所承载的 Spec 内容，就走本 Skill；请求里出现 report/html 字样不改变归属。"
        "只关心报告骨架、样式表、修订标记或 meta/双链格式本身时改用 html-report。"
        "默认复用 writer/plan.html 记录的 git_branch，不新建分支。"
        "不要用于新功能从零设计、已合并/已关闭分支上的后续需求，或需要独立 PR/MR 的较大变更。"
    ),
    "exp-write": (
        "记忆写入 Skill，将重大经验写入 spec/context/experience/ 或知识记忆写入 spec/context/knowledge/，"
        "并更新对应索引（不写 MEMORY.md）。触发场景：`/exp-write type=experience`、`/exp-write type=knowledge` 手动写入，"
        "exp-reflect 确认后落盘，或用户要求把内容已经确定的经验/知识写进记忆时使用，典型信号："
        "'把这次 AWR 踩坑写进经验记忆''把架构调研整理成知识记忆''把 exp-reflect 确认过的草稿写入索引'。"
        "本 Skill 只执行写入；判断是否值得沉淀、归哪类记忆、去重与草稿生成由 exp-reflect 负责，需要先识别分类时用 exp-reflect。"
        "仅处理经验记忆和知识记忆，程序记忆使用 skill-creator，工具记忆直接编辑 Skill。"
    ),
    "exp-reflect": (
        "当任务完成、解决困难问题、用户要求总结经验/记录项目理解/更新项目规范，"
        "或 spec-end/spec-update 需要从当前 Spec 文档判断是否沉淀经验、知识、SOP、工具记忆、长期项目规范时使用。"
        "本 Skill 只做识别 + 分类 + 权重判断 + 草稿 + 用户确认，不落盘写入；"
        "内容已经明确、只需写入经验/知识文件并更新索引时直接用 exp-write；"
        "程序记忆（SOP）落盘成新 Skill 用 skill-creator。"
        "不要用于普通文档摘要、历史记忆检索或已明确内容的直接写入。"
    ),
    "spec-start": (
        "当用户开始新的开发任务、需要启动完整 Spec 流程（需求对齐→探索→设计→实现→测试→收尾），"
        "或需要为一个新 Spec 创建协作上下文和 GitHub Flow 工作分支时使用。"
        "不要用于已有完成 Spec 的小迭代（用 spec-update）、项目首次初始化（用 spec-init）、"
        "运行期故障诊断与 bug 修复（用 spec-debug），或不需要启动 Spec 流程的纯文档/记忆写入（用对应 Skill）。"
    ),
    "spec-debug": (
        "诊断并修复 Spec 执行过程中发现的问题。由角色 spec-debugger 调用。"
        "触发条件：(1) 角色 spec-debugger 接收到 TeamLead 转交的 bug handoff，"
        "(2) spec-executor 执行后出现 bug 或 writer/plan.html 中未考虑到的情况，"
        "(3) 运行时出现问题、依赖环境或配置问题，(4) 用户要求诊断/修复线上问题、偶发故障、异常报错、"
        "环境依赖问题或回归排查。不修改已确认的 writer/plan.html，而是在 debugger/ 下创建独立的诊断文档"
        "（debug-xxx.html）和修复总结（debug-xxx-fix.html）。修复完成后向 TeamLead 提交重新验证请求，"
        "由 TeamLead 启动 spec-tester。触发词：诊断、修复、线上问题、偶发 500、复现、回滚。"
        "主动迭代新需求归 spec-start / spec-update，不要被笼统的'帮我做个开发任务'带走。"
    ),
}

KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*:")


def replace_description(path: Path, new_text: str) -> None:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"(---\s*\n)(.*?)(\n---)", text, re.S)
    if not m:
        raise SystemExit(f"{path}: frontmatter 缺失")
    head, fm, tail_open = m.group(1), m.group(2), m.group(3)
    lines = fm.splitlines()
    start = next(i for i, ln in enumerate(lines) if ln.startswith("description:"))
    end = start + 1
    while end < len(lines) and not KEY_RE.match(lines[end]):
        end += 1
    new_fm = "\n".join(lines[:start] + [f"description: {new_text}"] + lines[end:])
    path.write_text(head + new_fm + tail_open + text[m.end():], encoding="utf-8")


def main() -> None:
    for skill, new_text in PATCH.items():
        rel = Path(f"{skill}/SKILL.md")
        before = subprocess.run(
            ["git", "show", f"HEAD:{rel}"], capture_output=True, text=True, check=True
        ).stdout
        name_before = yaml.safe_load(re.match(r"---\s*\n(.*?)\n---", before, re.S).group(1))["name"]
        replace_description(rel, new_text)
        meta = yaml.safe_load(re.match(r"---\s*\n(.*?)\n---", rel.read_text(encoding="utf-8"), re.S).group(1))
        assert meta["name"] == name_before == skill, f"{skill}: name 漂移"
        assert len(meta["description"]) <= 1024, f"{skill}: description 超 1024 字符"
        rest_unchanged = rel.read_text(encoding="utf-8").split("\n---", 1)[1] == before.split("\n---", 1)[1]
        assert rest_unchanged, f"{skill}: 正文被改动"
        print(f"  {skill:12} name=ok len={len(meta['description']):4} body=unchanged")
    print(f"patched {len(PATCH)} files")


if __name__ == "__main__":
    main()
