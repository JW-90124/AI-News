# 系统设计

## 1. 设计原则

保持静态多页和现有 DTO 边界。重构发生在三层：

```text
Source / SourceCheck / Event / Evidence
  -> export 生成公开且可解释的消费模型
  -> pages 组织用户消费路径
  -> CSS + core.js 提供层级、筛选和移动端交互
```

## 2. 公开来源健康字段

`PublicSource` 增加只读字段：

```ts
healthStatus: "healthy" | "degraded" | "failed" | "skipped" | "unchecked"
lastCheckedAt: string | null
latestItemAt: string | null
healthErrorCode: string | null
```

exporter 读取 `latestSourceChecks()` 并按 source id 合并。公开 DTO 不包含 error summary、sample、代理信息或内部备注。

## 3. 技术覆盖计算

覆盖领域由版本化的代码配置定义，每项包含匹配词、期望渠道和补强提示。计算只使用公开 Source 字段：名称、slug、topics、category、role、acquisition、lifecycle 和最新健康状态。

状态规则：

- `covered`：至少两个健康来源，且具备两个以上渠道类型；
- `watch`：存在健康来源但渠道单一，或存在 degraded/failed 关键入口；
- `gap`：没有匹配来源或没有健康来源；
- `unchecked`：有目录来源但没有运行检查。

该状态是覆盖运营提示，不是事实可信度评分。

## 4. 事件发展序列

```text
event.evidence
  -> 按 publishedAt 升序
  -> 同 URL 去重
  -> 第一条：首次出现
  -> primary：官方更新
  -> amplification：外部讨论
  -> secondary：行业反馈
  -> Agent Pulse 分析：当前判断
```

Event 仍是唯一事实节点，Evidence 不升级为新的 Event。这样避免同一事件被打散，也不破坏当前 schema。

事件列表按 `max(event.happenedAt, evidence.publishedAt...)` 倒序。`featured` 只影响首页核心选择，不改变事件脉络时间顺序。

## 5. 前端交互

- 事件卡片与预览保持渐进增强；无 JavaScript 时仍可打开事件详情；
- 筛选计数使用“事件”而非“节点”；
- 来源覆盖卡支持按状态筛选，完整来源表继续支持搜索；
- 移动端预览使用抽屉，发展脉络在正文中可直接滚动；
- 所有 hover 同时提供 focus-visible 状态，并尊重 reduced motion。

## 6. 回滚

本轮不改数据库迁移。回滚只需恢复 static-site DTO/pages/render、CSS、core.js 和新增来源目录项；已有 snapshot 保持兼容，缺失健康字段时一律显示 unchecked。
