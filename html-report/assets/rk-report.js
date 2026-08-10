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


  document.addEventListener("DOMContentLoaded", function () {
    var max = tagLatest();
    build(max, marks().length);
    setView("all");
    renderNav();
    renderToc();
  });

})();
