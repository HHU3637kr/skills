#!/usr/bin/env node
/**
 * R&K 报告结构机检：多轮修订后最容易被写坏、肉眼又难发现的结构问题。
 *
 * 用法：
 *   node check-report.js <报告.html | 目录> [更多路径...]
 *
 * 检查项（任一不满足即退出码 1）：
 *   1. 修订历史表 table.rk-revs 恰好一张（新修订行只能追加到它的 tbody 末尾）
 *   2. 修订历史表每行第一列为 rN，且从 r1 起连续递增；末行 rN = <meta name="rk:revision">
 *   3. 所有表格的每一行列数（含 colspan）与表头一致——防止修订行被追加进别的表
 *   4. data-rev 只写纯数字（"2"，不写 "r2"），且不大于 rk:revision
 *   5. 内联 SVG 不写死 fill/stroke 颜色（用 rk-report.css 的 c-* / node / edge 等 class）
 *   6. 报告引用的 rk-report.css / rk-report.js 与本 Skill 的 assets 源文件内容一致
 *      ——项目内的复制件过期时，新样式规则（如 tr.rk-added）不生效
 *   7. 少字多图：按 rk:type 必须包含对应的图（见 REQUIRED_FIGURES），每 800 字正文至少一张图，
 *      单段 <p>/<li> 不超过 150 字。只检查新报告：<meta name="rk:created"> 早于 FIGURE_RULE_SINCE 的历史报告豁免，
 *      或用 --no-figures 跳过
 * 账本（team-context.*）豁免修订标记，跳过检查；templates/ 里的模板按落点写相对路径，不在原地检查。
 *
 * 零依赖，仅需 Node >= 14。
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set(["exports", "node_modules", ".git", "templates"]);
const SOURCE_ASSETS = path.resolve(__dirname, "..", "assets");

// ---------- 少字多图 ----------
// 规则生效日：此前创建的报告不追溯（rk:created 早于该日期视为历史报告）
const FIGURE_RULE_SINCE = "2026-11-05";
const MAX_CHARS_PER_FIGURE = 800; // 正文每 800 字至少一张图
const MAX_PARAGRAPH_CHARS = 150;  // 单段 <p>/<li> 上限

// 图组件识别：名字 → 在去注释后的 HTML 里出现即算有
const FIGURE_KINDS = {
  kpis: /class="[^"]*\brk-kpis\b/,
  flow: /<ol\b[^>]*class="[^"]*\brk-flow\b/,
  chart: /class="[^"]*\brk-bar\b/,
  barcell: /class="[^"]*\brk-barcell\b/,
  fig: /<figure\b[^>]*class="[^"]*\brk-fig\b[\s\S]*?<(?:svg|img)\b/,
};
const FIGURE_COUNT_RE = /class="[^"]*\b(?:rk-kpis|rk-flow|rk-chart|rk-fig)\b|<td\b[^>]*class="[^"]*\brk-barcell\b/g;

// 每类报告的必需图：外层数组之间是「且」，内层数组之间是「或」
const REQUIRED_FIGURES = {
  "exploration-report": [["fig"]],
  plan: [["fig"], ["flow"]],
  "test-plan": [["kpis", "chart", "flow"]],
  "test-report": [["kpis"], ["chart", "barcell"]],
  summary: [["kpis", "flow"]],
  debug: [["fig", "flow"]],
  "debug-fix": [["fig", "flow", "kpis"]],
  review: [["kpis"]],
  update: [["fig", "flow"]],
  "update-summary": [["kpis", "flow"]],
  "end-report": [["flow"]],
  "version-plan": [["flow"], ["kpis"]],
  "release-report": [["kpis"]],
  "version-end-report": [["kpis"], ["chart", "barcell"]],
};
const KIND_LABEL = { kpis: "rk-kpis 指标卡", flow: "rk-flow 流程条", chart: "rk-bar 柱状条", barcell: "rk-barcell 迷你条", fig: "figure.rk-fig 结构图（SVG/图片）" };

function collectHtml(p, acc) {
  const st = fs.statSync(p);
  if (st.isFile()) {
    if (/\.html?$/i.test(p) && !/^team-context\./i.test(path.basename(p))) acc.push(path.resolve(p));
  } else if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) {
      if (SKIP_DIRS.has(name)) continue;
      collectHtml(path.join(p, name), acc);
    }
  }
  return acc;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// 注释与 <pre> 内是示例代码，不参与结构检查；替换为等长空白以保持行号
function blankOut(text) {
  return text.replace(/<!--[\s\S]*?-->|<pre[\s>][\s\S]*?<\/pre>/gi, (m) => m.replace(/[^\n]/g, " "));
}

// 返回本行自身单元格占的列数，以及每个单元格向下延伸的行数（rowspan）
function rowCells(rowHtml) {
  const cells = [];
  const re = /<t[dh]\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(rowHtml))) {
    const col = /colspan\s*=\s*["']?(\d+)/i.exec(m[1]);
    const row = /rowspan\s*=\s*["']?(\d+)/i.exec(m[1]);
    cells.push({ cols: col ? parseInt(col[1], 10) : 1, rows: row ? parseInt(row[1], 10) : 1 });
  }
  return cells;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").trim();
}

function checkTables(t, report) {
  const tables = [];
  const re = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = re.exec(t))) {
    const rows = [];
    const rowRe = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
    let r;
    while ((r = rowRe.exec(m[2]))) {
      rows.push({ attrs: r[1], html: r[2], index: m.index + m[0].indexOf(m[2]) + r.index });
    }
    tables.push({ cls: /class\s*=\s*["']([^"']*)/i.exec(m[1]), index: m.index, rows });
  }

  for (const tb of tables) {
    if (!tb.rows.length) continue;
    const cols = rowCells(tb.rows[0].html).reduce((s, c) => s + c.cols, 0);
    // carry[i] = 被上方 rowspan 占用、还要延续 i 行的列数；逐行消费，避免把 rowspan 误判为缺列
    let carry = [];
    for (const row of tb.rows) {
      const cells = rowCells(row.html);
      const occupied = carry.reduce((s, c) => s + c.cols, 0);
      const n = occupied + cells.reduce((s, c) => s + c.cols, 0);
      if (row !== tb.rows[0] && n !== cols) {
        report(lineOf(t, row.index), `表格行有 ${n} 列，表头为 ${cols} 列（常见原因：修订历史行被追加进了别的表，或上方 rowspan 数值写大了）`);
      }
      carry = carry.map((c) => ({ cols: c.cols, rows: c.rows - 1 }))
        .concat(cells.filter((c) => c.rows > 1).map((c) => ({ cols: c.cols, rows: c.rows - 1 })))
        .filter((c) => c.rows > 0);
    }
  }

  return tables.filter((tb) => tb.cls && /\brk-revs\b/.test(tb.cls[1]));
}

function checkRevs(t, revTables, metaRev, report) {
  if (revTables.length !== 1) {
    const at = revTables.map((tb) => "L" + lineOf(t, tb.index)).join("、") || "无";
    report(revTables.length ? lineOf(t, revTables[1].index) : 1,
      `修订历史表 table.rk-revs 应恰好 1 张，实得 ${revTables.length} 张（${at}）；新修订行追加到原表 tbody 末尾，不要新建表`);
  }
  const revs = [];
  for (const tb of revTables) {
    for (const row of tb.rows.slice(1)) {
      const first = /<td\b[^>]*>([\s\S]*?)<\/td>/i.exec(row.html);
      const v = first ? /^r(\d+)$/.exec(stripTags(first[1])) : null;
      if (!v) {
        report(lineOf(t, row.index), `修订历史行第一列应为 rN，实得「${first ? stripTags(first[1]) : ""}」`);
        continue;
      }
      revs.push({ n: parseInt(v[1], 10), line: lineOf(t, row.index) });
    }
  }
  const seq = revs.map((r) => r.n);
  const bad = revs.findIndex((r, i) => r.n !== i + 1);
  if (bad !== -1) {
    report(revs[bad].line, `修订号应从 r1 起连续递增（新行追加在末尾），实得 ${seq.map((n) => "r" + n).join("、")}`);
  }
  const last = revs.length ? revs[revs.length - 1].n : 0;
  if (metaRev !== null && last !== metaRev) {
    report(1, `<meta name="rk:revision"> 为 ${metaRev}，修订历史末行为 r${last}，两者应一致`);
  }
}

function checkDataRev(t, metaRev, report) {
  const re = /\sdata-rev\s*=\s*["']([^"']*)["']/gi;
  let m;
  while ((m = re.exec(t))) {
    const line = lineOf(t, m.index);
    if (!/^\d+$/.test(m[1])) {
      report(line, `data-rev="${m[1]}" 应为纯数字（如 data-rev="${m[1].replace(/\D/g, "") || "N"}"），角标的 r 前缀由样式自动加`);
    } else if (metaRev !== null && parseInt(m[1], 10) > metaRev) {
      report(line, `data-rev="${m[1]}" 大于 rk:revision=${metaRev}`);
    }
  }
}

// 图表配色只走 rk-report.css 的 class（c-blue/c-green/…），SVG 里写死颜色会脱离统一配色
function checkSvgColors(t, report) {
  const re = /<svg\b[\s\S]*?<\/svg>/gi;
  let m;
  while ((m = re.exec(t))) {
    const attr = /\s(fill|stroke)\s*=\s*["'](#[0-9a-f]{3,8}|rgba?\([^"']*\)|hsla?\([^"']*\))["']/i.exec(m[0]);
    if (attr) {
      report(lineOf(t, m.index + attr.index), `SVG 写死了 ${attr[1]}="${attr[2]}"，改用 class（c-blue/c-green/c-amber/c-red/c-muted、node/edge/axis/grid）`);
    }
  }
}

function checkAssets(t, file, report) {
  for (const name of ["rk-report.css", "rk-report.js"]) {
    const m = new RegExp(`(?:href|src)\\s*=\\s*["']([^"']*${name.replace(".", "\\.")})["']`, "i").exec(t);
    if (!m) {
      report(1, `未引用 ${name}`);
      continue;
    }
    const used = path.resolve(path.dirname(file), m[1]);
    const src = path.join(SOURCE_ASSETS, name);
    if (!fs.existsSync(used)) {
      report(lineOf(t, m.index), `${name} 引用路径不存在：${used}（相对深度见 html-report/SKILL.md 路径深度表）`);
    } else if (fs.realpathSync(used) !== fs.realpathSync(src) &&
               !fs.readFileSync(used).equals(fs.readFileSync(src))) {
      report(lineOf(t, m.index), `${used} 与源文件 ${src} 内容不一致（项目副本已过期；改用 Junction/软链，或重新同步）`);
    }
  }
}

function metaOf(t, name) {
  const m = new RegExp(`<meta\\s+name=["']rk:${name}["']\\s+content=["']([^"']*)["']`, "i").exec(t);
  return m ? m[1] : null;
}

// 可见字符数（不含空白与标签）
function visibleChars(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
}

// 把匹配到的块替换为等长空白，保持行号与偏移不变
function blank(text, re) {
  return text.replace(re, (m) => m.replace(/[^\n]/g, " "));
}

// 按标签配对删除整个元素（处理 <div class="rk-kpis"> 里嵌套的 div）
function blankElements(text, tag, classRe) {
  const open = new RegExp(`<${tag}\\b[^>]*class="[^"]*${classRe}[^"]*"[^>]*>`, "gi");
  const any = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  let out = text;
  let m;
  while ((m = open.exec(out))) {
    any.lastIndex = m.index;
    let depth = 0, end = -1, x;
    while ((x = any.exec(out))) {
      depth += x[1] ? -1 : 1;
      if (depth === 0) { end = x.index + x[0].length; break; }
    }
    if (end < 0) break;
    out = out.slice(0, m.index) + out.slice(m.index, end).replace(/[^\n]/g, " ") + out.slice(end);
    open.lastIndex = end;
  }
  return out;
}

function checkFigures(t, report) {
  const type = metaOf(t, "type");
  const created = metaOf(t, "created");
  if (!type || !REQUIRED_FIGURES[type]) return;
  if (!created || created.slice(0, 10) < FIGURE_RULE_SINCE) return;

  const bodyStart = Math.max(0, t.search(/<body\b/i));
  const body = " ".repeat(bodyStart) + t.slice(bodyStart); // 与 t 同偏移

  // 1) 必需图
  const has = Object.fromEntries(Object.entries(FIGURE_KINDS).map(([k, re]) => [k, re.test(body)]));
  for (const anyOf of REQUIRED_FIGURES[type]) {
    if (!anyOf.some((k) => has[k])) {
      report(1, `少字多图：${type} 必须包含 ${anyOf.map((k) => KIND_LABEL[k]).join(" 或 ")}（画法见 html-report/references/figures.md）`);
    }
  }

  // 2) 图文比：只算叙述文字，不算表格、代码、图本身、修订历史与关联产物
  let prose = blank(body, /<(table|pre|code|script|svg|figure|nav|header)\b[\s\S]*?<\/\1>/gi);
  prose = blank(prose, /<ul\b[^>]*class="[^"]*\brk-(?:back)?links\b[\s\S]*?<\/ul>/gi);
  prose = blank(prose, /<ol\b[^>]*class="[^"]*\brk-flow\b[\s\S]*?<\/ol>/gi);
  prose = blankElements(prose, "div", "\\brk-kpis\\b");
  const chars = visibleChars(prose);
  const figures = (body.match(FIGURE_COUNT_RE) || []).length;
  const need = Math.ceil(chars / MAX_CHARS_PER_FIGURE);
  if (figures < need) {
    report(1, `少字多图：正文约 ${chars} 字只有 ${figures} 张图，按每 ${MAX_CHARS_PER_FIGURE} 字一张至少需要 ${need} 张——把数字、顺序、结构改成图，或删去图已表达的文字`);
  }

  // 3) 单段长度
  const paraRe = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = paraRe.exec(prose))) {
    const n = visibleChars(m[2]);
    if (n > MAX_PARAGRAPH_CHARS) {
      const head = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, "").slice(0, 16);
      report(lineOf(t, m.index), `少字多图：段落 ${n} 字超过 ${MAX_PARAGRAPH_CHARS} 字（「${head}…」）——拆成要点、表格或图`);
    }
  }
}

function checkFile(file, opts) {
  const raw = fs.readFileSync(file, "utf8");
  // 不引用 rk-report.css 的 HTML（原型、eli5 演示、第三方页面）不是 R&K 报告，跳过
  if (!/rk-report\.css/.test(raw)) return null;
  const t = blankOut(raw);
  const problems = [];
  const report = (line, msg) => problems.push(`${file}:${line}: ${msg}`);

  const meta = /<meta\s+name=["']rk:revision["']\s+content=["'](\d+)["']/i.exec(t);
  const metaRev = meta ? parseInt(meta[1], 10) : null;
  if (metaRev === null) report(1, `缺 <meta name="rk:revision" content="N">`);

  checkRevs(t, checkTables(t, report), metaRev, report);
  checkDataRev(t, metaRev, report);
  checkSvgColors(t, report);
  checkAssets(t, file, report);
  if (opts.figures) checkFigures(t, report);
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const opts = { figures: !args.includes("--no-figures") };
  const inputs = args.filter((a) => !a.startsWith("--"));
  if (!inputs.length || args.includes("-h") || args.includes("--help")) {
    console.log("用法: node check-report.js <报告.html | 目录> [更多路径...] [--no-figures]");
    process.exit(inputs.length ? 0 : 2);
  }
  const files = [];
  for (const p of inputs) collectHtml(p, files);
  if (!files.length) {
    console.error("❌ 未找到任何报告 HTML");
    process.exit(2);
  }
  const results = files.map((f) => checkFile(f, opts)).filter((r) => r !== null);
  if (!results.length) {
    console.error("❌ 未找到任何引用 rk-report.css 的报告 HTML");
    process.exit(2);
  }
  const problems = results.flat();
  if (problems.length) {
    console.error(`❌ 报告结构机检未通过（${problems.length} 项）：`);
    for (const p of problems) console.error("   - " + p);
    process.exit(1);
  }
  console.log(`✅ 报告结构机检通过（${results.length} 份报告）`);
}

main();
