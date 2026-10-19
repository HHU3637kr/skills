#!/usr/bin/env node
/**
 * R&K 报告导出：把相对引用的样式 / 脚本 / 图片内联，产出可单文件上传在线文档的 HTML。
 *
 * 用法：
 *   node export-standalone.js <报告.html | 目录> [更多路径...] [--out <输出目录>] [--keep-nav]
 *
 * - 输入是目录时递归导出其中全部 *.html（跳过 exports/ 与 node_modules/）
 * - 默认输出到「项目根/exports/」并保留报告相对项目根的路径；源报告只读，不被改动
 *   （项目根 = 向上最近的含 .git 的目录，找不到则用当前目录）
 * - 输出禁止落在 spec/versions/ 内：spec-end 机检会扫描 Spec 目录下全部 *.html，导出件会触发误报
 * - <link rel="stylesheet" href> → <style>；<script src> → <script> 并移到 </body> 前（保持 defer 语义）
 * - 本地 <img src> → data URI；http(s)/data: 引用原样保留
 * - 默认丢弃 rk-manifest.js：单文件里的导航树链接指向兄弟报告，上传后必然失效；--keep-nav 可保留
 *
 * 零依赖，仅需 Node >= 14。
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set(["exports", "node_modules", ".git"]);
const MIME = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
};

function parseArgs(argv) {
  const opts = { inputs: [], out: null, keepNav: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") opts.out = argv[++i];
    else if (a === "--keep-nav") opts.keepNav = true;
    else if (a === "-h" || a === "--help") opts.help = true;
    else opts.inputs.push(a);
  }
  return opts;
}

function collectHtml(p, acc) {
  const st = fs.statSync(p);
  if (st.isFile()) {
    if (/\.html?$/i.test(p)) acc.push(path.resolve(p));
  } else if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) {
      if (SKIP_DIRS.has(name)) continue;
      collectHtml(path.join(p, name), acc);
    }
  }
  return acc;
}

function attr(tag, name) {
  const m = tag.match(new RegExp("\\s" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", "i"));
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

function isRemote(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref);
}

function readLocal(baseDir, ref) {
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  const file = path.resolve(baseDir, clean);
  return fs.existsSync(file) ? { file, buf: fs.readFileSync(file) } : null;
}

function findRoot(start) {
  for (let d = start; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, ".git"))) return d;
    if (d === path.dirname(d)) return process.cwd();
  }
}

function exportOne(htmlPath, opts) {
  const baseDir = path.dirname(htmlPath);
  const warn = [];
  const trailingScripts = [];
  let html = fs.readFileSync(htmlPath, "utf8");
  let nCss = 0, nJs = 0, nImg = 0;

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const href = attr(tag, "href");
    if (!href || isRemote(href)) return tag;
    const f = readLocal(baseDir, href);
    if (!f) { warn.push("样式文件不存在，保留原引用: " + href); return tag; }
    nCss++;
    return "<style>\n" + f.buf.toString("utf8").replace(/<\/style/gi, "<\\/style") + "\n</style>";
  });

  html = html.replace(/<script\b[^>]*>\s*<\/script>/gi, (tag) => {
    const src = attr(tag, "src");
    if (!src || isRemote(src)) return tag;
    if (!opts.keepNav && /(^|[\\/])rk-manifest\.js$/i.test(src)) return "";
    const f = readLocal(baseDir, src);
    if (!f) { warn.push("脚本文件不存在，已丢弃该引用: " + src); return ""; }
    nJs++;
    trailingScripts.push("<script>\n" + f.buf.toString("utf8").replace(/<\/script/gi, "<\\/script") + "\n</script>");
    return "";
  });

  if (trailingScripts.length) {
    const block = trailingScripts.join("\n") + "\n";
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => block + "</body>") : html + "\n" + block;
  }

  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, "src");
    if (!src || isRemote(src)) return tag;
    const f = readLocal(baseDir, src);
    const mime = f && MIME[path.extname(f.file).toLowerCase()];
    if (!f || !mime) { warn.push("图片无法内联，保留原引用: " + src); return tag; }
    nImg++;
    return tag.replace(src, "data:" + mime + ";base64," + f.buf.toString("base64"));
  });

  if (!nCss) warn.push("未发现可内联的本地样式表（源文件可能已是单文件，或引用路径有误）");

  const root = findRoot(baseDir);
  const outDir = opts.out ? path.resolve(opts.out) : path.join(root, "exports");
  if (/[\\/]spec[\\/]versions[\\/]/i.test(outDir + path.sep)) {
    throw new Error("输出目录不能在 spec/versions/ 内（会被 spec-end 报告契约机检扫到）: " + outDir);
  }
  let rel = path.relative(root, htmlPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) rel = path.basename(htmlPath);
  const outFile = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, "utf8");
  return { outFile, nCss, nJs, nImg, warn, bytes: Buffer.byteLength(html) };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.inputs.length) {
    console.log("用法: node export-standalone.js <报告.html | 目录> [更多路径...] [--out <输出目录>] [--keep-nav]");
    process.exit(opts.help ? 0 : 2);
  }
  const files = [];
  for (const p of opts.inputs) {
    if (!fs.existsSync(p)) { console.error("路径不存在: " + p); process.exit(1); }
    collectHtml(p, files);
  }
  if (!files.length) { console.error("未找到 HTML 报告"); process.exit(1); }

  let failed = 0;
  for (const f of files) {
    try {
      const r = exportOne(f, opts);
      console.log("✔ " + r.outFile + "  (css×" + r.nCss + " js×" + r.nJs + " img×" + r.nImg + ", " + (r.bytes / 1024).toFixed(1) + " KB)");
      r.warn.forEach((w) => console.warn("  ⚠ " + w));
    } catch (e) {
      failed++;
      console.error("✘ " + f + ": " + e.message);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
