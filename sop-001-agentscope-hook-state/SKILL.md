# SOP: AgentScope Hook 多轮 Reasoning 状态管理

## 概述

当使用 AgentScope 的 Hook 机制（如 `post_print`、`post_reasoning` 等）追踪 Agent 状态时，需要特别注意 ReActAgent 的多轮 reasoning-acting 循环场景。本 SOP 提供状态管理的最佳实践。

## 适用场景

- 使用 Hook 追踪 Agent 的流式输出进度
- 使用 Hook 累积统计信息（如文本长度、token 数量）
- 使用 Hook 监控 Agent 的执行状态
- 任何需要在 Hook 中维护跨消息状态的场景

## 问题背景

### ReActAgent 执行流程

```
第一轮 _reasoning:
  → 创建新 Msg 对象（id: msg_001）
  → content 从空开始流式累积
  → 输出大量文本（如 5000 字符）
  → 包含 tool_use，进入 _acting

_acting:
  → 执行工具调用
  → 输出 tool_res_msg（ToolResultBlock）

第二轮 _reasoning:
  → 创建【新的】Msg 对象（id: msg_002）  ← 关键：新对象！
  → content 从空开始
  → 输出简短文本（如 50 字符）
```

### 常见问题

如果 Hook 中的状态变量（如 `_accumulated_length`）跨轮次持续累积：
- 第一轮结束：`_accumulated_length = 5000`
- 第二轮开始：新 Msg 的 content 只有 50 字符
- 判断 `50 <= 5000`，认为"无新内容"，错误跳过处理

## 解决方案

### 核心原则

**通过 `msg.id` 检测新消息，重置内部状态变量，但保留需要单调递增的值（如进度）**

### 代码模板

```python
class HookStateTracker:
    """Hook 状态追踪器模板"""

    def __init__(self):
        # 需要跨轮次保留的状态（如进度值）
        self._last_progress = 0.0

        # 需要按轮次重置的状态
        self._accumulated_length = 0
        self._last_msg_id = None  # 用于检测新消息

    async def on_hook(self, agent, kwargs, output):
        msg = kwargs.get("msg")
        if not msg:
            return

        # ========== 关键：检测新消息 ==========
        msg_id = getattr(msg, 'id', None)
        if msg_id and msg_id != self._last_msg_id:
            self._last_msg_id = msg_id
            # 重置按轮次累积的状态
            self._accumulated_length = 0
            # 注意：不重置 _last_progress，确保进度不回退

        # ========== 正常的状态更新逻辑 ==========
        text_content = self._extract_text(msg)
        current_length = len(text_content)

        # 检查是否有新内容
        if current_length <= self._accumulated_length:
            return
        self._accumulated_length = current_length

        # 计算进度（确保单调递增）
        new_progress = self._calculate_progress(current_length)
        if new_progress <= self._last_progress:
            new_progress = self._last_progress + 0.001
        self._last_progress = new_progress

        # 执行回调
        await self._callback(new_progress, text_content)
```

### 状态变量分类

| 类型 | 示例 | 新轮次处理 |
|------|------|-----------|
| 跨轮次保留 | `_last_progress`（进度值） | 不重置 |
| 按轮次重置 | `_accumulated_length`（累积长度） | 重置为 0 |
| 轮次标识 | `_last_msg_id`（消息 ID） | 更新为新 ID |

## 检查清单

使用 Hook 追踪状态时，确认以下事项：

- [ ] 是否添加了 `_last_msg_id` 属性用于检测新消息？
- [ ] 是否在检测到新消息时重置按轮次累积的状态？
- [ ] 是否保留了需要单调递增的状态（如进度值）？
- [ ] 是否使用 `getattr(msg, 'id', None)` 安全获取 ID？

## 相关文件

- `backend/services/framework/progress_tracker.py` - 流式进度追踪器实现
- AgentScope 源码：`src/agentscope/agent/_react_agent.py` - ReActAgent 实现

## 参考

- AgentScope Hook 文档：https://doc.agentscope.io/zh_CN/tutorial/task_hook.html
- Spec 更新记录：`spec/06-已归档/20260106-评估体系解析流式进度优化/update-001.md`

---

## 后续动作（工具记忆）

完成 Hook 状态管理实现后，你应该：

### 验证步骤
1. 编写模拟多轮 reasoning 的单元测试
2. 验证新轮次开始时状态正确重置
3. 验证进度/计数等值保持单调递增

### 常见陷阱
- 忘记添加 `_last_msg_id` 检测
- 错误地重置了需要保留的状态（如进度值）
- 未考虑 `msg.id` 可能为 None 的情况
