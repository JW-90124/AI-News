# 系统设计

## 1. 年月分组

`sortEventsByLatestDevelopment()` 继续提供唯一排序；新增 `groupEventsByYearMonth()`：

```ts
type EventYearGroup = {
  year: number;
  months: Array<{
    key: "2026-07";
    label: "2026年7月";
    events: EnrichedEvent[];
  }>;
};
```

分组依据是 `latestDevelopmentAt(event)`，不是最初发生时间。筛选继续作用于事件卡片，前端根据可见卡片同步隐藏空月份和空年份。

## 2. 全端抽屉

```text
event card click
  -> select panel
  -> update ?event=slug
  -> open drawer + backdrop
  -> lock body scroll
  -> focus close button

close / Esc / backdrop
  -> close drawer
  -> remove event query when appropriate
  -> restore trigger focus
```

桌面抽屉固定右侧，移动端从底部进入。使用 `role="dialog"`、`aria-modal="true"`、`aria-hidden` 和焦点恢复，不引入前端框架。

## 3. GitHub Star

新增异步 build-time resolver：

```text
fresh Actions env metadata
  -> use injected stars
missing/stale metadata + non-test build
  -> GET api.github.com/repos/barretlee/agent-pulse
  -> bounded timeout
  -> allowlisted counts only
failure
  -> render Star component without fabricated number
```

组件 HTML 始终为 `GitHub icon | Star | count`；静态站运行时不访问 GitHub。

## 4. 研究事件门禁

`eventabilityScore()` 增加 `research-eval` 与 decision-relevant research 判断。非相关论文即使存在模型名，也封顶在事件阈值以下；相关论文只进入 `review`。

readiness 对 `research` / `paper` 增加技术内容深度要求：technical insight、industry insight 和 future outlook 不能只是短句或占位文本。自动发布仍需通过全部既有门禁。

## 5. 公开内容

首批六篇论文作为人工 curated Event 进入 `historicalEvents`：

- source 固定为 `arxiv-ai`；
- category 为 `research`；
- fact 明确写“预印本”；
- heat 不根据论文目录伪造；
- technical 写方法与结果；
- future 写复现、外部验证和失效条件。

## 6. 回滚

- 抽屉可回滚为原双栏预览，不涉及数据迁移；
- GitHub resolver 失败自动退回无数字组件；
- 研究门禁与 curated Event 均为代码级可逆变更；
- 不修改数据库 schema。

## 7. 研究分层与按日聚合

```text
published research Event
  -> Timeline research filter: always visible
  -> same UTC day research count >= 4
       -> collapsed daily research group
       -> expand to individual Event cards
  -> reviewed research depth passed
       -> eligible for homepage research selection
```

`data-research` 表达 Event 是否属于研究类型，不再表达是否达到首页精选深度；精选判断继续由 `isReviewedResearch()` 独立负责。

日聚合只发生在静态页面表示层：

- 分组依据为 `latestDevelopmentAt(event)` 的 UTC 日期；
- Event、永久链接、抽屉 panel 和 Evidence 均保持独立；
- 前端筛选按组内可见卡片同步隐藏或显示聚合容器；
- 研究筛选和关键词搜索自动展开命中的论文日报。

候选研究摘要最小长度为 160；research readiness 的 technical / industry / future 最小长度调整为 56 / 36 / 28。其他 readiness blocker 不变。

## 8. 全站按需证据抽屉

```text
event trigger on any public page
  -> preserve fallback href
  -> open shared drawer shell
  -> fetch data/timeline.json once
  -> find Event by slug
  -> build safe DOM with textContent
  -> update ?event=slug

explicit full-event action / modified click / no JS
  -> navigate to permanent Event page
```

抽屉壳由 `pageLayout()` 统一输出，并携带相对 `timeline.json` 地址和当前语言 Event 路径。Timeline 页面不再预渲染全部 `eventPreview`，避免 HTML 与同一份 Event 数据重复。

性能边界：

- JSON 只在首次交互或 URL 已带 `?event=` 时加载；
- 同页复用 Promise 与 slug map，不重复请求和解析；
- 抽屉内容切换只替换一个内容容器；
- 使用 `contain`、`overscroll-behavior` 和有限 transform 动画；
- `prefers-reduced-motion` 下禁用位移动画；
- 外部字段只通过 `textContent` 写入，URL 只允许 http/https。

筛选隐藏必须由显式选择器保证：`.timeline-month[hidden]`、`.timeline-year[hidden]`、`.research-day-group[hidden]` 和 `.timeline-card[hidden]` 均为 `display: none`。
