# Feature Map 模板（用户视角功能地图）

用于目标项目沉淀一份持久化的**用户视角功能站点地图与统一测试驱动约定**，建议落盘在目标项目的：

`spec/context/knowledge/feature-map.md`（保持 Markdown 供 `exp-search` 检索）

本模板融合了 `pstack` 的 `feature-map` 共享词汇表、`create-verification-skill` 的 `Launch / Doctor / Drive` 约定与 `maintain-verification-skill` 的防漂移校准机制：让用户、`spec-writer`、`spec-tester` 与 `spec-reviewer` 使用同一套产品术语与稳定入口，减少每次 E2E 现猜选择器与启动命令的 Token 消耗。

---

## 模板正文（复制到目标项目 `spec/context/knowledge/feature-map.md` 后替换 `{占位符}`）

```markdown
---
app_name: {项目/应用名称}
surface: {web | desktop | cli | api | mixed}
last_verified_commit: {40位或短Git提交哈希，与当前地图状态对齐}
updated: {YYYY-MM-DD}
owner: {维护角色/团队，默认 spec-tester}
---

# {项目名称} 用户视角 Feature Map

> 本文档是人类与 Agent 之间的**共享词汇表**。描述某页面或操作时优先使用下表中的「用户视角名称」和 `FM-xxx` 编号；端侧自动化优先复用本文件约定的启动命令、统一驱动 CLI 与稳定选择器。

## 1. 环境启动与健康检查（Launch & Doctor）

| 项 | 约定 | 说明 |
|---|---|---|
| 启动命令（Launch） | `{例如：pnpm dev --port 3100}` | 须能从空数据目录/隔离端口就绪，含必要 seed/迁移 |
| 就绪判定（Ready） | `{例如：GET http://localhost:3100/health 返回 200 且日志输出 READY}` | 仅端口通不算就绪，必须业务可用 |
| 健康探针（Doctor） | `{例如：curl -sf http://localhost:3100/health && pnpm test:smoke}` | 异常时先跑此只读检查判断环境是否可测 |
| 并发隔离约定 | `{例如：每次 run 使用独立端口 PORT 和临时用户目录}` | 禁止双实例共用同一数据目录或用户会话 |
| 脱敏与环境边界 | `{例如：仅使用测试账号 test@example.com，禁止连生产库}` | 证据导出前须剥离 token / cookie / 个人隐私 |

## 2. 统一测试驱动与 CLI（Drive）

> 优先复用项目既有驱动或单一封装 CLI，避免每条 Spec 重复手写样板脚本。

- **常规浏览器自动化**：`{例如：pnpm exec playwright test --config=playwright.e2e.config.ts}`
- **CDP / 探针辅助入口**：`{例如：node scripts/e2e-probe.mjs --run-id <RUN_ID> --case <US-ID>}`
- **证据统一落盘约定**：`spec/versions/<version>/specs/<spec-dir>/tester/artifacts/test-logs/<RUN_ID>/`
  - 截图命名规范：`screenshots/{US-ID}-{关键状态slug}.png`（例如 `US-001-submitted.png`）
  - 控制台/网络/后端日志：`browser-console.ndjson`、`network-summary.json`、`backend.log`

## 3. 用户视角功能地图（共享词汇表）

| 功能 ID | 用户视角名称 | 入口（URL / 菜单路径） | 稳定选择器 / 定位词汇 | 关键状态与核心断言 | 关联后端日志 / Trace 标识 |
|---|---|---|---|---|---|
| FM-001 | `{例如：创建并提交订单}` | `{/orders/new -> 顶部「新建订单」}` | `{[data-testid="order-submit-btn"], role=button[name="提交"]}` | `{草稿 -> 提交中 -> 已下单；提交后按钮禁用防重复}` | `{POST /api/orders, event=order.created, req_id}` |
| FM-002 | `{例如：订单列表筛选与取消}` | `{/orders -> 左侧「我的订单」}` | `{[data-testid="order-filter"], [data-testid="cancel-order"]}` | `{待支付可取消；已取消后不可再支付}` | `{POST /api/orders/:id/cancel, event=order.cancelled}` |

## 4. 防漂移维护规则（与 `spec-test` / `spec-review` 联动）

1. **谁维护**：`spec-tester` 在每次执行涉及端侧/用户路径的测试时核对本表；`spec-reviewer` 审查 `reviewer/review.html` 时按本表核对用户路径覆盖是否遗漏。
2. **何时更新**：当实测发现某个入口 URL、稳定选择器（`data-testid` / `role`）或业务状态名称已随产品合法演进发生变化（而非产品 Bug）时，同步更新第 3 节表格，并将头部 `last_verified_commit` 推进到当前已验证提交。
3. **禁止行为**：不得在未实测验证的情况下凭猜测修改 `last_verified_commit` 或删除尚未下线的功能行。
```
