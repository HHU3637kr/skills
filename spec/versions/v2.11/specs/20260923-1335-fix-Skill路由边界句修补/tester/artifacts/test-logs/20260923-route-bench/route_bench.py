#!/usr/bin/env python3
"""Skill 路由基准（route_bench.py）

机械计分器：从 22 个核心流程 skill 的 SKILL.md frontmatter 提取 description 构造
judge state，再按 gold 对 judge 输出打分。本脚本只做机械计分，不做任何判定。

用法：
  # 1) 生成 state 文件（供 harness judge 原语消费）
  python3 route_bench.py --source git-head --emit-states states.json
  python3 route_bench.py --source worktree --emit-states states.json

  # 2) 用任意 judge 原语回答后，把答案写回并计分
  python3 route_bench.py --source git-head --answers answers.json --gold gold.json
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROSTER = [
    "spec-init", "spec-start", "spec-explore", "spec-write", "spec-test", "spec-execute",
    "spec-debug", "spec-review", "spec-update", "spec-end", "spec-swarm",
    "version-start", "version-update", "version-release", "version-end",
    "git-work", "exp-search", "exp-reflect", "exp-write",
    "intent-confirmation", "html-report", "find-skills",
]

REQUESTS = [
    ("r01", "用 /spec-start 的完整流程做登录改造，从需求对齐跑到收尾", "spec-start"),
    ("r02", "改 writer/plan.html 漏的分页参数", "spec-update"),
    ("r03", "项目第一次接入 R&K Flow，帮我初始化 spec/ 目录和报告资产", "spec-init"),
    ("r04", "写一份 writer/plan.html，把分页查询的接口边界定清楚", "spec-write"),
    ("r05", "代码已经按 plan.html 实现完了，现在执行端到端测试并出 test-report.html", "spec-test"),
    ("r06", "线上分页接口偶发 500，帮我诊断并修复", "spec-debug"),
    ("r07", "这个 v2.11 要不要把缓存的 Spec 移出本期范围，重新排一下依赖", "version-update"),
    ("r08", "把 AWR 踩坑沉淀到记忆", "exp-write"),
    ("r09", "这次改动要推到 release 分支上，先核对 tag 和镜像标签对不对", "git-work"),
    ("r10", "spec/versions 里以前有没有踩过分页的坑，帮我查一下", "exp-search"),
    ("r11", "需求还没想清楚，先帮我澄清一下到底要做到什么程度", "intent-confirmation"),
    ("r12", "实现看起来差不多做完了，帮我看看是不是严格按 Spec 执行的", "spec-review"),
    ("r13", "核对 tester 用例是否真跑过", "spec-test"),
    ("r14", "v2.11 已经发完线上，做版本复盘并归档", "version-end"),
    ("r15", "report.html 的样式表相对路径错了，离线双击打开掉样式，帮我修骨架和 meta", "html-report"),
    ("r16", "把 update-001.html 的修订历史表补一行，写清楚这次改了什么、为什么", "spec-update"),
    ("r17", "这条经验挺重要，直接写进 spec/context/experience/ 并更新索引", "exp-write"),
    ("r18", "executor 说它单测全绿，帮我校验是不是真的跑过、证据是不是自动生成的", "spec-test"),
    ("r19", "评估一下 tester 的用例质量，看断言有没有意义、是不是假绿", "spec-test"),
    ("r20", "实现自称完成了，从 reviewer 视角核对是否严格按 plan.html 执行", "spec-review"),
    ("r21", "report.html 的 meta 少了 rk:updated，反链也没补，帮我按契约补齐", "html-report"),
    ("r22", "给 update-002.html 补一行修订历史，把 D-004 的原因写进去", "spec-update"),
    ("r23", "把这次 build 流程整理成一个可复用 SOP，做成 skill", "exp-reflect"),
    ("r24", "knowledge/ 里以前有没有写过缓存架构的分析，帮我找一下", "exp-search"),
    ("r25", "帮我判断这段会话保持的坑到底值不值得记下来", "exp-reflect"),
    ("r27", "debugger 修完 bug，重新跑一轮测试确认不再复现", "spec-test"),
]

# 实验 A 报告的 3 个错判 + 本次扩展实测发现的第 4 个同型碰撞
KNOWN_MISSES = ["r02", "r08", "r13", "r06"]
ORIGINAL_MISSES = ["r02", "r08", "r13"]


def description(text: str) -> str:
    fm = re.match(r"---\s*\n(.*?)\n---", text, re.S)
    if not fm:
        raise SystemExit("frontmatter 缺失")
    m = re.search(r"^description:\s*(.*?)(?=^[a-zA-Z_][a-zA-Z0-9_-]*:|\Z)", fm.group(1), re.S | re.M)
    if not m:
        raise SystemExit("frontmatter 缺少 description")
    raw = m.group(1)
    lines = [ln.strip() for ln in raw.splitlines()]
    return " ".join(x for x in lines if x).lstrip(">").strip()


def roster_from(source: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for skill in ROSTER:
        rel = f"{skill}/SKILL.md"
        if source == "worktree":
            out[skill] = description(Path(rel).read_text(encoding="utf-8"))
        elif source == "git-head":
            blob = subprocess.run(
                ["git", "show", f"HEAD:{rel}"], capture_output=True, text=True, check=True
            ).stdout
            out[skill] = description(blob)
        else:
            raise SystemExit(f"unknown source: {source}")
    return out


def build_states(roster: dict[str, str]) -> dict[str, str]:
    catalog = "\n".join(f"- {name}: {roster[name]}" for name in ROSTER)
    return {
        rid: f"用户请求：{req}\n\n可用 Skill 清单：\n{catalog}"
        for rid, req, _ in REQUESTS
    }


def score(answers: dict[str, str], gold: dict[str, str]) -> tuple[int, list[tuple[str, str, str]]]:
    miss = [
        (rid, gold[rid], answers.get(rid, "<no-answer>"))
        for rid in gold
        if answers.get(rid) != gold[rid]
    ]
    return len(gold) - len(miss), miss


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["git-head", "worktree"], required=True)
    ap.add_argument("--emit-states")
    ap.add_argument("--answers")
    ap.add_argument("--gold")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    if args.emit_states:
        states = build_states(roster_from(args.source))
        Path(args.emit_states).write_text(
            json.dumps(states, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        print(f"states written: {args.emit_states} ({len(states)} states, source={args.source})")

    if args.answers:
        gold = {
            rid: g for rid, _, g in REQUESTS
        }
        answers = json.loads(Path(args.answers).read_text(encoding="utf-8"))
        if not args.quiet:
            for rid, req, g in REQUESTS:
                print(f"  {rid}: gold={g:<20} picked={answers.get(rid, '<none>'):<20} {req[:34]}")
        ok, miss = score(answers, gold)
        total = len(gold)
        print(f"SCORE source={args.source} correct={ok}/{total}")
        print("MISSES:")
        for rid, g, p in miss:
            tag = "KNOWN" if rid in KNOWN_MISSES else "extra"
            print(f"  - {rid} [{tag}] gold={g} picked={p}")
        print(f"KNOWN_HIT={sum(1 for rid, _, _ in miss if rid in KNOWN_MISSES)}/{len(KNOWN_MISSES)}")
        sys.exit(0)


if __name__ == "__main__":
    main()
