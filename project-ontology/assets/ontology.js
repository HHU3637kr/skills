/*
 * 项目本体总览报告交互（project-ontology skill，通用）
 * ─────────────────────────────────────────────────────
 * 与 ontology.css 配套，缺本文件则 tab 切换与折叠行全部失效。
 * 用法：由 render-ontology.js 内联进报告底部 </body> 前的 <script>（保持单文件离线可开）。
 *
 * 两件事：
 *   ① tab 切换 + URL hash / popstate 同步（刷新/分享/后退停在正确页面）
 *   ② 表格行内折叠：点 tr.gx-row 展开紧随其后的 tr.gx-detail
 */
(function () {
  var tabs = document.querySelectorAll("nav.tabs button");
  var pages = document.querySelectorAll("section.tab-page");

  function activate(name, push) {
    tabs.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
    pages.forEach(function (p) { p.classList.toggle("active", p.id === "tab-" + name); });
    // pushState 而非 replaceState：让浏览器后退键能回到上一个 tab
    if (push && location.hash !== "#" + name) history.pushState(null, "", "#" + name);
    window.scrollTo(0, 0);
  }

  tabs.forEach(function (b) {
    b.addEventListener("click", function () { activate(b.dataset.tab, true); });
  });

  // 深链接 + 前进/后退：首次加载读 hash，之后监听 hashchange
  // （只在启动时读一次会导致改 hash / 按后退键内容不跟着切）
  function syncFromHash(push) {
    var name = location.hash.replace("#", "");
    // 空 hash（后退到「未带 hash」的历史条目）回到第一个 tab，而不是停在原页不动
    if (!name && tabs.length) { activate(tabs[0].dataset.tab, false); return; }
    if (name && document.getElementById("tab-" + name)) activate(name, push);
  }
  syncFromHash(false);
  window.addEventListener("hashchange", function () { syncFromHash(false); });
  // 后退/前进到「无 hash」的条目时不会触发 hashchange（只触发 popstate），
  // 缺这一行会导致点了 tab 再按后退，URL 回去了而内容没回去。
  window.addEventListener("popstate", function () { syncFromHash(false); });

  // 表格行内折叠：点击 .gx-row 展开/收起紧随其后的 .gx-detail 行
  document.querySelectorAll("tr.gx-row").forEach(function (row) {
    row.addEventListener("click", function () {
      var detail = row.nextElementSibling;
      if (!detail || !detail.classList.contains("gx-detail")) return;
      var opened = !detail.hidden;
      detail.hidden = opened;
      row.classList.toggle("open", !opened);
    });
  });
})();
