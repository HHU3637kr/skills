/* R&K Flow HTML Report - 修订视图切换
 * 三视图：all=全部修订 / latest=仅最新修订 / clean=终稿
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

  document.addEventListener("DOMContentLoaded", function () {
    var max = tagLatest();
    build(max, marks().length);
    setView("all");
  });
})();
