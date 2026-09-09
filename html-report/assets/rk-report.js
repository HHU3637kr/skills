/* R&K Flow HTML Report
 * 1) 修订视图切换：all=全部修订 / latest=仅最新修订 / clean=终稿
 * 2) 左侧导航树：读 window.RK_SPEC_TREE（由 Spec 根目录的 rk-manifest.js 提供）
 * 无依赖，纯 DOM。报告以 file:// 打开即可用。
 */
(function () {
  "use strict";

  var VIEWS = ["all", "latest", "clean"];
  var LABEL = { all: "全部修订", latest: "仅最新修订", clean: "终稿" };

  function marks() {
    return document.querySelectorAll(
      "ins.rk-ins, del.rk-del, .rk-added, .rk-removed",
    );
  }

  // 标出最新修订号，供 .is-latest 样式使用
  function tagLatest() {
    var all = marks();
    var max = 0;
    all.forEach(function (el) {
      var r = parseInt(el.getAttribute("data-rev") || "0", 10);
      if (r > max) max = r;
    });
    all.forEach(function (el) {
      var r = parseInt(el.getAttribute("data-rev") || "0", 10);
      el.classList.toggle("is-latest", r === max && max > 0);
    });
    return max;
  }

  function setView(view) {
    VIEWS.forEach(function (v) {
      document.body.classList.toggle("rk-view-" + v, v === view);
    });
    document.querySelectorAll(".rk-revbar button[data-view]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.view === view));
    });
  }

  function build(maxRev, count) {
    var bar = document.querySelector(".rk-revbar");
    if (!bar) return;
    var info = document.createElement("span");
    info.className = "lbl";
    info.textContent =
      maxRev > 0 ? "修订 r" + maxRev + "，标记 " + count + " 处：" : "视图：";
    bar.appendChild(info);
    VIEWS.forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.view = v;
      b.textContent = LABEL[v];
      b.addEventListener("click", function () {
        setView(v);
      });
      bar.appendChild(b);
    });
  }

  /* ---------- 导航树 ---------- */

  // 当前页在 manifest 中的 path（相对 Spec 根）。报告位于角色目录内，
  // 故取「目录名/文件名」两段即可，不依赖绝对路径，file:// 与 http 下同样成立。
  function currentPath() {
    var segs = decodeURIComponent(location.pathname).split("/").filter(Boolean);
    return segs.length < 2 ? "" : segs[segs.length - 2] + "/" + segs[segs.length - 1];
  }

  function renderNav() {
    var mount = document.querySelector("nav.rk-nav");
    var tree = window.RK_SPEC_TREE;
    // manifest 缺失或为空：不渲染节点，靠 .rk-nav:empty 隐藏导航区，正文不受影响
    if (!mount || !tree || !Array.isArray(tree.docs) || !tree.docs.length) return;

    var here = currentPath();

    // 按 role 分组，保留 manifest 中的出现顺序
    var order = [];
    var byRole = Object.create(null);
    tree.docs.forEach(function (d) {
      if (!d || !d.path) return;
      var role = d.role || "misc";
      if (!byRole[role]) { byRole[role] = []; order.push(role); }
      byRole[role].push(d);
    });
    if (!order.length) return;

    // 品牌区 R&K Flow：由脚本渲染，manifest 缺失时随整个导航一起消失（.rk-nav:empty）
    var brand = document.createElement("div");
    brand.className = "rk-nav-brand";

    var bn = document.createElement("span");
    bn.className = "n";
    // R<em>&</em>K Flow —— & 用强调色
    bn.appendChild(document.createTextNode("R"));
    var amp = document.createElement("em");
    amp.textContent = "&";
    bn.appendChild(amp);
    bn.appendChild(document.createTextNode("K Flow"));
    brand.appendChild(bn);

    var bs = document.createElement("span");
    bs.className = "s";
    bs.textContent = "Spec Driven";
    brand.appendChild(bs);

    mount.appendChild(brand);

    var title = document.createElement("div");
    title.className = "rk-nav-title";
    title.textContent = "本 Spec 文档";
    mount.appendChild(title);

    var root = document.createElement("ul");
    root.className = "rk-nav-tree";

    order.forEach(function (role) {
      var group = document.createElement("li");
      group.className = "rk-nav-group";

      var label = document.createElement("span");
      label.className = "rk-nav-role";
      label.textContent = role;
      group.appendChild(label);

      var list = document.createElement("ul");
      byRole[role].forEach(function (d) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        // path 相对 Spec 根；报告在角色目录内，故前缀 ../
        a.setAttribute("href", "../" + d.path);
        a.textContent = d.title || d.path;
        if (d.path === here) {
          a.className = "is-current";
          a.setAttribute("aria-current", "page");
        }
        li.appendChild(a);
        list.appendChild(li);
      });

      group.appendChild(list);
      root.appendChild(group);
    });

    mount.appendChild(root);
  }

  /* ---------- 右侧章节导航 (TOC) ---------- */

  // 报告作者不必手写 id：没有就按序号补，保证锚点稳定可跳转
  function ensureIds(list) {
    list.forEach(function (h, i) {
      if (!h.id) h.id = "sec-" + (i + 1);
    });
  }

  function renderToc() {
    var mount = document.querySelector(".rk-toc");
    if (!mount) return;

    var headings = [].slice.call(document.querySelectorAll("h2"));
    if (!headings.length) return;
    ensureIds(headings);

    var title = document.createElement("div");
    title.className = "rk-toc-title";
    title.textContent = "本页导读";
    mount.appendChild(title);

    var ul = document.createElement("ul");
    var links = [];
    headings.forEach(function (h2) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h2.id;
      a.textContent = h2.textContent.trim();
      // 平滑滚动 + 立即高亮，不等 observer
      a.addEventListener("click", function (e) {
        e.preventDefault();
        h2.scrollIntoView({ behavior: "smooth", block: "start" });
        setCurrent(h2.id);
      });
      li.appendChild(a);
      ul.appendChild(li);
      links.push(a);
    });
    mount.appendChild(ul);

    function setCurrent(id) {
      links.forEach(function (a) {
        a.classList.toggle("is-current", a.getAttribute("href") === "#" + id);
      });
    }

    // scroll spy：多个标题同时可见时取最靠上的那个
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function (a, b) {
        return a.boundingClientRect.top - b.boundingClientRect.top;
      });
      setCurrent(visible[0].target.id);
    }, { rootMargin: "-5% 0px -75% 0px", threshold: 0 });

    headings.forEach(function (h2) { observer.observe(h2); });
    setCurrent(headings[0].id);
  }
  /* ---------- 现代右侧抽屉式评审批注系统（DOM-First 架构） ---------- */
  function initAnnotationSystem() {
    var specMeta = document.querySelector('meta[name="rk:spec-dir"]');
    var roleMeta = document.querySelector('meta[name="rk:role"]');
    var stableId = (specMeta && specMeta.content) ? (specMeta.content + "_" + (roleMeta ? roleMeta.content : "doc")) : location.pathname;
    var STORAGE_KEY = "rk_notes_" + stableId;
    var COUNTER_KEY = "rk_notes_seq_" + stableId;

    var localDrafts = [];
    var nextSeq = 1;

    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) localDrafts = JSON.parse(saved);
      var savedSeq = localStorage.getItem(COUNTER_KEY);
      if (savedSeq) nextSeq = parseInt(savedSeq, 10) || 1;
    } catch (e) {}

    // 1. 从当前 HTML DOM 中主动提取已固化、已闭环的批注（HTML 为权威源）
    var domNotes = [];
    document.querySelectorAll('.rk-note[data-note-id]').forEach(function (el) {
      var nid = el.getAttribute("data-note-id") || "";
      var heading = el.getAttribute("data-rk-heading") || "正文章节";
      var quote = el.getAttribute("data-rk-quote") || "";
      var bodyEl = el.querySelector(".rk-note-body") || el;
      var opinion = bodyEl.textContent.trim();
      var isResolved = el.classList.contains("is-done");

      // 解析现有 ID 中的最大数字，保障单调递增
      var numMatch = nid.match(/^NOTE-(\d+)$/);
      if (numMatch) {
        var nVal = parseInt(numMatch[1], 10);
        if (nVal >= nextSeq) nextSeq = nVal + 1;
      }

      domNotes.push({
        id: nid,
        heading: { id: "", title: heading },
        container: "HTML固化标记",
        quote: quote,
        opinion: opinion,
        status: isResolved ? "resolved" : "open",
        fromDom: true
      });
    });

    // 2. 合并 DOM 权威记录与本地草稿（DOM 优先）
    var domIds = new Set(domNotes.map(function (d) { return d.id; }));
    var notes = domNotes.slice();

    localDrafts.forEach(function (draft) {
      if (!domIds.has(draft.id)) {
        notes.push(draft);
        var numMatch = (draft.id || "").match(/^NOTE-(\d+)$/);
        if (numMatch) {
          var nVal = parseInt(numMatch[1], 10);
          if (nVal >= nextSeq) nextSeq = nVal + 1;
        }
      }
    });

    function saveNotes() {
      // 仅将用户新增的本地草稿持久化到 LocalStorage，不重复冗余存储 DOM 原生固化项
      var userDrafts = notes.filter(function (n) { return !n.fromDom; });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userDrafts));
        localStorage.setItem(COUNTER_KEY, String(nextSeq));
      } catch (e) {}
      renderCards();
    }
    // 2. DOM: 划词微型悬浮按钮
    var tipBtn = document.createElement("button");
    tipBtn.type = "button";
    tipBtn.className = "rk-anno-tip-btn";
    tipBtn.textContent = "💬 批注";
    tipBtn.style.display = "none";
    document.body.appendChild(tipBtn);

    // 3. DOM: 抽屉面板（全类名控制，移除所有行内 style=）
    var drawer = document.createElement("div");
    drawer.className = "rk-anno-drawer";
    drawer.innerHTML =
      '<div class="rk-anno-drawer-head">' +
        '<div class="rk-anno-drawer-title">💬 评审意见 <span class="badge rk-anno-badge"></span></div>' +
        '<button type="button" class="rk-anno-drawer-close" title="收起抽屉">✕</button>' +
      '</div>' +
      '<div class="rk-anno-drawer-body">' +
        '<div class="rk-anno-composer">' +
          '<div class="rk-anno-composer-quote"></div>' +
          '<textarea class="rk-anno-composer-input" placeholder="输入评审/修改意见（Ctrl+Enter 保存）..."></textarea>' +
          '<div class="rk-anno-composer-actions">' +
            '<button type="button" class="rk-anno-btn-sm rk-anno-composer-cancel">取消</button>' +
            '<button type="button" class="rk-anno-composer-submit">暂存批注</button>' +
          '</div>' +
        '</div>' +
        '<div class="rk-anno-cards-container"></div>' +
      '</div>' +
      '<div class="rk-anno-drawer-foot">' +
        '<button type="button" class="rk-anno-batch-btn rk-anno-copy-pending">📋 复制未处理批注给 Agent (<span class="pending-count">0</span>)</button>' +
      '</div>';
    document.body.appendChild(drawer);

    // 4. DOM: 屏幕右下角触发胶囊（纯 CSS 类控制）
    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "rk-anno-toggle-pill";
    pill.innerHTML = '💬 批注 <span class="pill-count rk-anno-pill-count">0</span>';
    document.body.appendChild(pill);
    var composer = drawer.querySelector(".rk-anno-composer");
    var composerQuote = drawer.querySelector(".rk-anno-composer-quote");
    var composerInput = drawer.querySelector(".rk-anno-composer-input");
    var composerSubmit = drawer.querySelector(".rk-anno-composer-submit");
    var composerCancel = drawer.querySelector(".rk-anno-composer-cancel");
    var cardsContainer = drawer.querySelector(".rk-anno-cards-container");
    var badge = drawer.querySelector(".rk-anno-drawer-title .badge");
    var pendingCountEl = drawer.querySelector(".pending-count");
    var pillCountEl = pill.querySelector(".pill-count");
    var closeBtn = drawer.querySelector(".rk-anno-drawer-close");

    var cachedRange = null;
    var cachedQuote = "";
    var cachedHeading = null;
    var cachedContainer = "";

    function openDrawer() {
      drawer.classList.add("is-open");
      pill.style.display = "none";
      document.body.classList.add("has-anno-gutter");
      scheduleGutterLayout();
    }
    function closeDrawer() {
      drawer.classList.remove("is-open");
      pill.style.display = "flex";
      document.body.classList.remove("has-anno-gutter");
    }

    // 宽屏默认采用正文旁 gutter；窄屏保留点击展开抽屉。
    function syncGutterMode() {
      if (window.innerWidth >= 1440) {
        document.body.classList.add("has-anno-gutter");
        drawer.classList.add("is-open");
        pill.style.display = "none";
      } else if (!drawer.classList.contains("is-open")) {
        document.body.classList.remove("has-anno-gutter");
      }
      if (typeof scheduleGutterLayout === "function") scheduleGutterLayout();
    }

    pill.addEventListener("click", openDrawer);
    closeBtn.addEventListener("click", closeDrawer);

    // 向上查找所属章节
    function findHeading(node) {
      var curr = node;
      while (curr && curr !== document.body) {
        var prev = curr.previousElementSibling;
        while (prev) {
          if (/^H[1-6]$/i.test(prev.tagName)) {
            return { id: prev.id || "", title: prev.textContent.trim() };
          }
          prev = prev.previousElementSibling;
        }
        curr = curr.parentElement;
      }
      return { id: "", title: "正文概述" };
    }

    function findContainer(node) {
      var el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      while (el && el !== document.body) {
        if (el.id) return el.tagName.toLowerCase() + "#" + el.id;
        if (/^(P|LI|TD|TR|SECTION|DIV|TABLE)$/i.test(el.tagName)) {
          var tag = el.tagName.toLowerCase();
          if (el.className) tag += "." + el.className.split(" ")[0];
          return tag;
        }
        el = el.parentElement;
      }
      return "正文";
    }

    // 划词监听
    tipBtn.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); });

    document.addEventListener("mouseup", function (e) {
      if (drawer.contains(e.target) || tipBtn.contains(e.target) || pill.contains(e.target)) return;

      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        tipBtn.style.display = "none";
        return;
      }
      var range = sel.getRangeAt(0);
      var text = sel.toString().trim();
      if (text.length < 2 || !document.body.contains(range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)) {
        tipBtn.style.display = "none";
        return;
      }
      var rect = range.getBoundingClientRect();
      cachedQuote = text;
      cachedRange = range.cloneRange();
      cachedHeading = findHeading(range.commonAncestorContainer);
      cachedContainer = findContainer(range.commonAncestorContainer);
      tipBtn.style.top = Math.max(10, window.scrollY + rect.top - 36) + "px";
      tipBtn.style.left = Math.max(10, window.scrollX + rect.left + rect.width / 2 - 32) + "px";
      tipBtn.style.display = "block";
    });

    // 点击气泡打开右侧抽屉并展开输入框
    // 点击气泡原位展开批注输入框：在被划词文字正右侧原位悬浮弹出！
    tipBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      tipBtn.style.display = "none";
      openDrawer();
      composerQuote.textContent = "“" + (cachedQuote.slice(0, 80) + (cachedQuote.length > 80 ? "..." : "")) + "”";
      composerInput.value = "";
      composer.style.display = "block";

      if (window.innerWidth >= 1440 && cachedRange) {
        // 宽屏模式：使用文档绝对 Y 轴对齐（完全独立于抽屉滚动或局部容器）
        var rRect = cachedRange.getBoundingClientRect();
        var drawerRect = drawer.getBoundingClientRect();
        var absTop = (window.scrollY + rRect.top) - (window.scrollY + drawerRect.top);
        composer.style.position = "absolute";
        composer.style.top = Math.max(16, absTop - 10) + "px";
        composer.style.left = "14px";
        composer.style.right = "14px";
        composer.style.zIndex = "100";
      } else {
        composer.style.position = "";
        composer.style.top = "";
        composer.style.left = "";
        composer.style.right = "";
        composer.style.zIndex = "";
      }

      composerInput.focus();
    });

    function submitComposer() {
      var val = composerInput.value.trim();
      if (!val) {
        composerInput.style.borderColor = "#ef4444";
        composerInput.focus();
        setTimeout(function () { composerInput.style.borderColor = ""; }, 1600);
        return;
      }
      // 消费单调自增序号 nextSeq，生成稳定短号 NOTE-01, NOTE-02...
      var noteId = "NOTE-" + (nextSeq < 10 ? "0" + nextSeq : nextSeq);
      nextSeq++;

      notes.push({
        id: noteId,
        heading: cachedHeading || { id: "", title: "正文" },
        container: cachedContainer || "正文",
        quote: cachedQuote,
        opinion: val,
        status: "open",
        fromDom: false,
        createdAt: new Date().toLocaleString("zh-CN")
      });

      composer.style.display = "none";
      cachedRange = null;
      cachedQuote = "";
      if (window.getSelection) window.getSelection().removeAllRanges();
      saveNotes();
    }

    composerSubmit.addEventListener("click", submitComposer);
    composerCancel.addEventListener("click", function () {
      composer.style.display = "none";
      cachedRange = null;
      cachedQuote = "";
    });

    composerInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitComposer();
      } else if (e.key === "Escape") {
        composer.style.display = "none";
      }
    });
    function escapeAttr(str) {
      return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // 格式化单条批注为精确 Markdown
    function formatSingleNoteMarkdown(n) {
      var specDir = (document.querySelector('meta[name="rk:spec-dir"]') || {}).content || "";
      var filePath = location.pathname.split("/").slice(-2).join("/");
      return "#### [批注 ID: " + n.id + "] 章节：" + n.heading.title + (n.heading.id ? " (`#" + n.heading.id + "`)" : "") + "\n" +
             "- **目标文件**: `" + filePath + "`\n" +
             (specDir ? "- **所属 Spec**: `" + specDir + "`\n" : "") +
             "- **定位节点**: `" + n.container + "`\n" +
             "- **引用原文**:\n" +
             "  > \"" + n.quote.replace(/\n/g, " ") + "\"\n" +
             "- **用户批注意见**:\n" +
             "  > **" + n.opinion + "**\n\n" +
             "**Agent 闭环执行契约（严禁丢失用户原文）**：在正文修改处紧随插入闭环 Callout：\n" +
             "```html\n" +
             "<div class=\"rk-note is-done\" data-note-id=\"" + n.id + "\" data-rk-heading=\"" + escapeAttr(n.heading.title) + "\" data-rk-quote=\"" + escapeAttr(n.quote) + "\">\n" +
             "  <div class=\"rk-note-badge-bar\">\n" +
             "    <span class=\"rk-note-badge-main\">用户批注</span>\n" +
             "    <span class=\"rk-note-badge-status\">" + n.id + " · 已决策</span>\n" +
             "  </div>\n" +
             "  <div class=\"rk-note-quote-box\">\n" +
             "    「" + escapeHtml(n.opinion) + "」\n" +
             "  </div>\n" +
             "  <div class=\"rk-note-body\">\n" +
             "    <b>采纳：修改决策说明...</b><br>\n" +
             "    具体落地代码/方案说明...\n" +
             "  </div>\n" +
             "</div>\n" +
             "```\n";
    }

    // 格式化批注集合，输出具备双向追溯性的专业 Prompt 契约
    function formatBatchMarkdown(list, titleText) {
      var specDir = (document.querySelector('meta[name="rk:spec-dir"]') || {}).content || "";
      var filePath = location.pathname.split("/").slice(-2).join("/");
      var md = "### 📋 来自用户对 " + filePath + " 的" + titleText + "（共 " + list.length + " 条）\n\n" +
               "> 目标文件: `" + filePath + "`\n" +
               (specDir ? "> 所属 Spec: `" + specDir + "`\n" : "") +
               "> 导出时间: " + new Date().toLocaleString("zh-CN") + "\n\n";

      list.forEach(function (n) {
        md += "#### [批注 ID: " + n.id + "] 章节：" + n.heading.title + (n.heading.id ? " (`#" + n.heading.id + "`)" : "") + "\n" +
              "- **定位节点**: `" + n.container + "`\n" +
              "- **引用原文**:\n" +
              "  > \"" + n.quote.replace(/\n/g, " ") + "\"\n" +
              "- **评审修改意见**:\n" +
              "  > **" + n.opinion + "**\n\n" +
              "---\n\n";
      });

      md += "**Agent 闭环执行契约（严禁丢失用户原文）**：\n" +
            "1. 请根据上述引用的原文定位具体代码/设计章节完成修改，并推进版本修订号（如 r1 -> r2）；\n" +
            "2. 修改完成后，在 HTML 对应修改处紧随插入标准决议 Callout（必须完整保留用户原始意见，不可遗漏）：\n" +
            "   ```html\n" +
            "   <div class=\"rk-note is-done\" data-note-id=\"NOTE-XX\" data-rk-heading=\"...\" data-rk-quote=\"...\">\n" +
            "     <div class=\"rk-note-badge-bar\">\n" +
            "       <span class=\"rk-note-badge-main\">用户批注</span>\n" +
            "       <span class=\"rk-note-badge-status\">NOTE-XX · 已决策</span>\n" +
            "     </div>\n" +
            "     <div class=\"rk-note-quote-box\">\n" +
            "       「用户的原始修改意见全文...」\n" +
            "     </div>\n" +
            "     <div class=\"rk-note-body\">\n" +
            "       <b>采纳：方案核心决策...</b><br>\n" +
            "       具体落地的重构/调整说明...\n" +
            "     </div>\n" +
            "   </div>\n" +
            "   ```\n";
      return md;
    }

    function copyText(text, btn, successMsg) {
      var origText = btn.textContent;
      function ok() {
        btn.textContent = successMsg || "✅ 已复制！";
        setTimeout(function () { btn.textContent = origText; }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok).catch(function () { fallback(text); });
      } else {
        fallback(text);
      }
      function fallback(t) {
        var ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); ok(); } catch(e) { prompt("请手动复制：", t); }
        document.body.removeChild(ta);
      }
    }

    // 渲染卡片
    function renderCards() {
      cardsContainer.innerHTML = "";

      // 从页面实际 HTML 中读取 Agent 已经回填闭环的 note-id（HTML 是唯一权威源）
      var resolvedInDom = new Set();
      document.querySelectorAll('.rk-note.is-done[data-note-id]').forEach(function (el) {
        var nid = el.getAttribute("data-note-id");
        if (nid) resolvedInDom.add(nid);
      });

      // 纯从 DOM 派生待处理项
      var pendingList = notes.filter(function (n) {
        return !resolvedInDom.has(n.id) && !n.fromDom;
      });

      badge.textContent = "(待处理 " + pendingList.length + ")";
      pendingCountEl.textContent = pendingList.length;
      pillCountEl.textContent = pendingList.length;

      // 飞书同款原则：已经解决并固化到正文中的批注，在正文 Callout 中展示决策与原文，右侧 Gutter 仅展示活跃待处理的批注
      var gutterNotes = notes.filter(function (n) {
        return !isNoteResolved(n);
      });

      if (gutterNotes.length === 0) {
        cardsContainer.innerHTML = '<div class="rk-anno-empty">暂无待处理批注<br><span class="rk-anno-empty-hint">所有批注均已在正文中闭环采纳，或选中文本后点击 [💬 批注] 添加新意见</span></div>';
        return;
      }

      gutterNotes.forEach(function (n) {
        var isResolved = false;
        var isDraft = true;
        var card = document.createElement("div");
        card.className = "rk-anno-card" + (isResolved ? " is-resolved" : "");
        card.id = "card-" + n.id;

        // 提取引用摘要，并支持截断
        var rawQuote = (n.quote || "").trim();
        var displayQuote = rawQuote.length > 22 ? rawQuote.slice(0, 22) + "..." : rawQuote;

        card.innerHTML =
          '<!-- 1. 卡片顶部条：胶囊式原文引用 + 右侧快捷功能（定位/复制/菜单） -->' +
          '<div class="rk-anno-card-topbar">' +
            '<div class="rk-anno-card-quote-pill rk-anno-action-locate" title="点击在正文中精准定位此句">' +
              '<span class="rk-anno-card-quote-pill-bar"></span>' +
              '<span>' + escapeHtml(displayQuote) + '</span>' +
            '</div>' +
            '<div class="rk-anno-card-top-tools">' +
              '<button type="button" class="rk-anno-icon-btn rk-anno-action-locate" title="定位到原文">🎯</button>' +
              '<button type="button" class="rk-anno-icon-btn rk-anno-action-copy-single" title="复制此条 Markdown">🔗</button>' +
              '<button type="button" class="rk-anno-icon-btn rk-anno-action-more" title="更多操作">···</button>' +
              '<!-- 菜单下拉框 -->' +
              '<div class="rk-anno-dropdown-menu">' +
                (isDraft
                  ? '<div class="rk-anno-dropdown-item rk-anno-action-edit">✏️ 编辑意见</div>' +
                    '<div class="rk-anno-dropdown-item rk-anno-action-copy-menu">📋 复制给 Agent</div>' +
                    '<div class="rk-anno-dropdown-item is-danger rk-anno-action-del">🗑️ 删除草稿</div>'
                  : '<div class="rk-anno-dropdown-item rk-anno-action-copy-menu">📋 复制给 Agent</div>' +
                    '<div class="rk-anno-dropdown-item" style="color:var(--fg-faint);cursor:default;">🔒 已固化闭环</div>') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<!-- 2. 用户与时间行 -->' +
          '<div class="rk-anno-user-row">' +
            '<div class="rk-anno-avatar">' + (n.author ? n.author.slice(0, 1).toUpperCase() : '评') + '</div>' +
            '<span class="rk-anno-username">' + escapeHtml(n.author || '评审者') + '</span>' +
            '<span class="rk-anno-time">' + (isResolved ? '✓ 已闭环' : '待处理') + '</span>' +
          '</div>' +
          '<!-- 3. 评论正文展示与修改态 -->' +
          '<div class="rk-anno-card-view-mode">' +
            '<div class="rk-anno-card-content">' + escapeHtml(n.opinion) + '</div>' +
          '</div>' +
          (isDraft
            ? '<div class="rk-anno-card-edit-mode" style="display:none;margin:8px 0;">' +
                '<textarea class="rk-anno-composer-input rk-anno-edit-input" style="height:60px;background:var(--bg-soft);border:1px solid var(--line);border-radius:4px;padding:6px;"></textarea>' +
                '<div class="rk-anno-composer-actions" style="margin-top:6px;">' +
                  '<button type="button" class="rk-anno-btn-sm rk-anno-btn-cancel-edit">取消</button>' +
                  '<button type="button" class="rk-anno-btn-sm rk-anno-composer-submit rk-anno-btn-save-edit">保存</button>' +
                '</div>' +
              '</div>'
            : '') +
          '<!-- 4. 底部微型回复框（支持展开回复） -->' +
          '<div class="rk-anno-reply-trigger">' +
            '<div class="rk-anno-reply-box">' +
              '<span>回复...</span>' +
              '<span>💬</span>' +
            '</div>' +
          '</div>' +
          '<div class="rk-anno-reply-form" style="display:none;margin-top:8px;">' +
            '<textarea class="rk-anno-composer-input rk-anno-reply-input" rows="4" maxlength="2000" placeholder="输入追加回复..." spellcheck="false"></textarea>' +
            '<div class="rk-anno-reply-meta"><span class="rk-anno-reply-count">0 / 2000</span><span>Ctrl + Enter 发送</span></div>' +
            '<div class="rk-anno-composer-actions" style="margin-top:6px;">' +
              '<button type="button" class="rk-anno-btn-sm rk-anno-btn-cancel-reply">取消</button>' +
              '<button type="button" class="rk-anno-btn-sm rk-anno-composer-submit rk-anno-btn-save-reply">发送</button>' +
            '</div>' +
          '</div>';

        // 下拉菜单展示控制
        var moreBtn = card.querySelector(".rk-anno-action-more");
        var dropdown = card.querySelector(".rk-anno-dropdown-menu");
        moreBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          // 关闭其他卡片的下拉框
          document.querySelectorAll(".rk-anno-dropdown-menu.is-show").forEach(function (m) {
            if (m !== dropdown) m.classList.remove("is-show");
          });
          dropdown.classList.toggle("is-show");
        });

        // 评论卡片本身是正文锚点的激活对象：点击卡片展开，点击同一卡片再次收起
        card.addEventListener("click", function (event) {
          if (event.target.closest("button, textarea, .rk-anno-reply-box, .rk-anno-dropdown-menu, .rk-anno-dropdown-item")) return;
          var active = card.classList.toggle("is-active");
          if (active) locateQuoteInDocument(n);
          scheduleGutterLayout();
        });

        // 点击卡片定位原文
        card.querySelectorAll(".rk-anno-action-locate").forEach(function (el) {
          el.addEventListener("click", function () {
            card.classList.add("is-active");
            locateQuoteInDocument(n);
            scheduleGutterLayout();
          });
        });

        // 复制单条（快捷按钮与菜单项共用）
        function doCopySingle(btn) {
          var singleMd = formatSingleNoteMarkdown(n);
          copyText(singleMd, btn, "✅ 已复制！");
        }
        card.querySelector(".rk-anno-action-copy-single").addEventListener("click", function () {
          doCopySingle(this);
        });
        card.querySelector(".rk-anno-action-copy-menu").addEventListener("click", function () {
          dropdown.classList.remove("is-show");
          doCopySingle(this);
        });
        // 修改与删除逻辑
        if (isDraft) {
          var viewMode = card.querySelector(".rk-anno-card-view-mode");
          var editMode = card.querySelector(".rk-anno-card-edit-mode");
          var editInput = card.querySelector(".rk-anno-edit-input");
          var editItem = card.querySelector(".rk-anno-action-edit");
          var cancelEditBtn = card.querySelector(".rk-anno-btn-cancel-edit");
          var saveEditBtn = card.querySelector(".rk-anno-btn-save-edit");
          var delItem = card.querySelector(".rk-anno-action-del");

          editItem.addEventListener("click", function () {
            dropdown.classList.remove("is-show");
            viewMode.style.display = "none";
            editInput.value = n.opinion;
            editMode.style.display = "block";
            editInput.focus();
          });

          cancelEditBtn.addEventListener("click", function () {
            editMode.style.display = "none";
            viewMode.style.display = "block";
          });

          function saveEdit() {
            var val = editInput.value.trim();
            if (!val) {
              editInput.style.borderColor = "#ef4444";
              editInput.focus();
              setTimeout(function () { editInput.style.borderColor = ""; }, 1600);
              return;
            }
            n.opinion = val;
            saveNotes();
            editMode.style.display = "none";
            viewMode.style.display = "block";
          }

          saveEditBtn.addEventListener("click", saveEdit);
          editInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              saveEdit();
            } else if (e.key === "Escape") {
              editMode.style.display = "none";
              viewMode.style.display = "block";
            }
          });

          delItem.addEventListener("click", function () {
            dropdown.classList.remove("is-show");
            if (!confirm("确定删除该条评审草稿吗？")) return;
            notes = notes.filter(function (x) { return x.id !== n.id; });
            saveNotes();
          });
        }

        // 4. 回复输入展开与保存交互
        var replyTrigger = card.querySelector(".rk-anno-reply-trigger");
        var replyForm = card.querySelector(".rk-anno-reply-form");
        var replyInput = card.querySelector(".rk-anno-reply-input");
        var replyCount = card.querySelector(".rk-anno-reply-count");
        var cancelReplyBtn = card.querySelector(".rk-anno-btn-cancel-reply");
        var saveReplyBtn = card.querySelector(".rk-anno-btn-save-reply");
        replyTrigger.addEventListener("click", function (event) {
          event.stopPropagation();
          card.classList.add("is-active");
          replyTrigger.style.display = "none";
          replyForm.style.display = "block";
          replyInput.focus();
        });

        function updateReplyCount() {
          replyCount.textContent = replyInput.value.length + " / 2000";
        }
        replyInput.addEventListener("input", updateReplyCount);
        cancelReplyBtn.addEventListener("click", function () {
          replyInput.value = "";
          updateReplyCount();
          replyForm.style.display = "none";
          replyTrigger.style.display = "block";
        });
        function submitReply() {
          var rText = replyInput.value.trim();
          if (!rText) return;

          if (n.fromDom) {
            // 针对已固化闭环项：自动生成一条全新的关联追问草稿（单调递增 ID，待 Agent 闭环）
            var newId = "NOTE-" + (nextSeq < 10 ? "0" + nextSeq : nextSeq);
            nextSeq++;
            var followUpNote = {
              id: newId,
              heading: n.heading,
              container: n.container,
              quote: n.quote,
              opinion: "【针对 " + n.id + " 的追问】：\n" + rText,
              status: "open",
              fromDom: false,
              replyTo: n.id,
              author: "评审者",
              createdAt: new Date().toLocaleTimeString("zh-CN")
            };
            notes.push(followUpNote);
            saveNotes();
          } else {
            n.opinion += "\n\n> 补充回复：" + rText;
            saveNotes();
          }
          replyInput.value = "";
          updateReplyCount();
          replyForm.style.display = "none";
          replyTrigger.style.display = "block";
        }

        saveReplyBtn.addEventListener("click", submitReply);
        replyInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submitReply();
          } else if (e.key === "Escape") {
            replyForm.style.display = "none";
            replyTrigger.style.display = "block";
          }
        });

        cardsContainer.appendChild(card);
      });
      layoutGutterCards();
    }

    function findQuoteRange(targetEl, quote) {
      var wanted = (quote || "").trim();
      if (!targetEl || !wanted) return null;
      var nodes = [], text = "";
      var walker = document.createTreeWalker(targetEl, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        nodes.push({ node: node, start: text.length, end: text.length + node.nodeValue.length });
        text += node.nodeValue;
      }
      var idx = text.indexOf(wanted);
      if (idx < 0) return null;
      var end = idx + wanted.length, startNode = null, endNode = null;
      var startOffset = 0, endOffset = 0;
      nodes.forEach(function (item) {
        if (!startNode && idx >= item.start && idx < item.end) { startNode = item.node; startOffset = idx - item.start; }
        if (!endNode && end > item.start && end <= item.end) { endNode = item.node; endOffset = end - item.start; }
      });
      if (!startNode || !endNode) return null;
      var range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    }
    function layoutGutterCards() {
      if (window.innerWidth < 1440) {
        cardsContainer.style.minHeight = "";
        cardsContainer.querySelectorAll(".rk-anno-card").forEach(function (c) {
          c.style.position = ""; c.style.top = ""; c.style.left = "";
          c.style.right = ""; c.style.width = "";
        });
        return;
      }
      var containerRect = cardsContainer.getBoundingClientRect();
      var lastBottom = 16;
      // 先计算出每条笔记在正文中的真实几何锚点
      var positionedCards = [];
      cardsContainer.querySelectorAll(".rk-anno-card").forEach(function (card) {
        var note = notes.find(function (x) { return x.id === card.id.replace("card-", ""); });
        var targetEl = null;
        if (note && note.container && note.container.startsWith("#")) {
          try { targetEl = document.querySelector(note.container); } catch (e) {}
        }
        var range = null;
        if (note && note.quote) {
          var blocks = document.querySelectorAll("p, li, td, th, blockquote, .rk-cal, .rk-verdict");
          for (var b = 0; b < blocks.length; b++) {
            range = findQuoteRange(blocks[b], note.quote);
            if (range) { targetEl = blocks[b]; break; }
          }
        }
        if (!range && targetEl && note) range = findQuoteRange(targetEl, note.quote);
        if (!range && !targetEl && note && note.heading && note.heading.title) {
          var hds = document.querySelectorAll("h1, h2, h3, h4");
          for (var i = 0; i < hds.length; i++) {
            if (hds[i].textContent.trim().indexOf(note.heading.title.trim()) !== -1) {
              targetEl = hds[i];
              break;
            }
          }
        }
        var anchorRect = range ? range.getBoundingClientRect() : (targetEl ? targetEl.getBoundingClientRect() : null);
        // 计算正文锚点相对于卡片容器的绝对纵向距离（消除所有视口滚动偏差）
        var docAnchorY = anchorRect ? (window.scrollY + anchorRect.top) : 99999;
        var docContainerY = window.scrollY + containerRect.top;
        var idealTop = Math.max(16, docAnchorY - docContainerY - 12);

        positionedCards.push({
          card: card,
          docAnchorY: docAnchorY,
          idealTop: idealTop
        });
      });

      // 严格按正文原文出现的物理垂直高度升序排序
      positionedCards.sort(function (a, b) { return a.docAnchorY - b.docAnchorY; });

      // 顺序重新追加 DOM 并执行防重叠向下避让
      positionedCards.forEach(function (item) {
        cardsContainer.appendChild(item.card);
        var actualTop = Math.max(item.idealTop, lastBottom);
        item.card.style.position = "absolute";
        item.card.style.top = actualTop + "px";
        item.card.style.left = "14px";
        item.card.style.right = "14px";
        item.card.style.width = "auto";
        lastBottom = actualTop + item.card.offsetHeight + 14;
      });
      cardsContainer.style.minHeight = (lastBottom + 30) + "px";
    }
    // 统一派生谓词：只要在 DOM 中存在 is-done 或本身就是从 DOM 提取的固化项，即为已闭环
    function isNoteResolved(n) {
      return Boolean(n.fromDom || document.querySelector('.rk-note.is-done[data-note-id="' + n.id + '"]'));
    }
    drawer.querySelector(".rk-anno-copy-pending").addEventListener("click", function () {
      var openList = notes.filter(function (n) { return !isNoteResolved(n); });
      if (!openList.length) {
        copyText("", this, "ℹ️ 当前没有待处理批注");
        return;
      }
      var md = formatBatchMarkdown(openList, "待处理评审批注");
      copyText(md, this, "✅ 已复制 " + openList.length + " 条待处理批注！");
    });
    var copyAllBtn = drawer.querySelector(".rk-anno-copy-all");
    if (copyAllBtn) {
      copyAllBtn.addEventListener("click", function () {
        if (!notes.length) {
          copyText("", this, "ℹ️ 当前没有任何批注");
          return;
        }
        var md = formatBatchMarkdown(notes, "全量历史评审批注");
        copyText(md, this, "✅ 已复制全部 " + notes.length + " 条历史批注！");
      });
    }
    // 全局定位高亮定时器句柄与统一定时常量
    var locateTimer = null;
    var LOCATE_MS = 1500;

    // 飞书式正文精准文本定位：支持跨标签（<code>/<ins>/<strong>等）文本拼接二分 Range 构造
    function locateQuoteInDocument(n) {
      // 清理前一次未结束的定位状态
      if (locateTimer) {
        clearTimeout(locateTimer);
        locateTimer = null;
      }
      if ("Highlight" in window && CSS && CSS.highlights) {
        CSS.highlights.delete("rk-anno-locate");
      }
      document.querySelectorAll(".rk-locate-pulse").forEach(function (el) {
        el.classList.remove("rk-locate-pulse");
      });

      var targetEl = null;
      var matchedRange = null;
      var cleanQuote = (n.quote || "").trim();

      // 1. 全文广度优先精确文本匹配：不再受限于旧的 container 选择器或标题
      if (cleanQuote) {
        var searchContainers = document.querySelectorAll("p, li, td, th, blockquote, .rk-cal, .rk-verdict");
        for (var sc = 0; sc < searchContainers.length; sc++) {
          var cRange = findQuoteRange(searchContainers[sc], cleanQuote);
          if (cRange) {
            matchedRange = cRange;
            targetEl = searchContainers[sc];
            break;
          }
        }
      }

      // 2. 降级回退：按关联的 container ID 或章节标题兜底
      if (!targetEl && n.container && n.container.startsWith("#")) {
        try { targetEl = document.querySelector(n.container); } catch (e) { targetEl = null; }
      }
      if (!targetEl && n.heading && n.heading.title) {
        var headings = document.querySelectorAll("h1, h2, h3, h4");
        for (var i = 0; i < headings.length; i++) {
          if (headings[i].textContent.trim().indexOf(n.heading.title.trim()) !== -1) {
            targetEl = headings[i];
            break;
          }
        }
      }
      // 如果连段落和章节都没匹配到，优雅降级到正文顶部，绝不弹阻断性 alert
      if (!targetEl) {
        targetEl = document.querySelector(".rk-head") || document.body;
      }
      // 若广度搜索未能命中，再在最终 fallback 的 targetEl 内部遍历一次生成 Range
      if (!matchedRange && cleanQuote && targetEl) {
        matchedRange = findQuoteRange(targetEl, cleanQuote);
      }
      if (matchedRange && "Highlight" in window && CSS && CSS.highlights) {
        var hl = new Highlight(matchedRange);
        CSS.highlights.set("rk-anno-locate", hl);
        (matchedRange.startContainer.parentElement || targetEl).scrollIntoView({ behavior: "smooth", block: "center" });
        locateTimer = setTimeout(function () {
          CSS.highlights.delete("rk-anno-locate");
          locateTimer = null;
        }, LOCATE_MS);
      } else {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.classList.add("rk-locate-pulse");
        locateTimer = setTimeout(function () {
          targetEl.classList.remove("rk-locate-pulse");
          locateTimer = null;
        }, LOCATE_MS);
      }
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // 初始化渲染；先注册调度器，覆盖字体与内容异步重排
    var relayoutFrame = 0;
    function scheduleGutterLayout() {
      if (relayoutFrame) return;
      relayoutFrame = requestAnimationFrame(function () {
        relayoutFrame = 0;
        layoutGutterCards();
      });
    }
    syncGutterMode();
    window.addEventListener("resize", syncGutterMode, { passive: true });
    renderCards();
    scheduleGutterLayout();
    window.addEventListener("resize", scheduleGutterLayout, { passive: true });
    window.addEventListener("scroll", scheduleGutterLayout, { passive: true });
    cardsContainer.addEventListener("scroll", scheduleGutterLayout, { passive: true });
    if (window.ResizeObserver) {
      var layoutObserver = new ResizeObserver(scheduleGutterLayout);
      layoutObserver.observe(cardsContainer);
      document.querySelectorAll("p, li, td, blockquote, .rk-cal").forEach(function (el) {
        layoutObserver.observe(el);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var max = tagLatest();
    build(max, marks().length);
    setView("all");
    renderNav();
    renderToc();
    initAnnotationSystem();
  });

})();
