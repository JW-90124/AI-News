# 系统设计

## 1. 内容结构

```text
Event（唯一事实）
  ├─ Track（六个决策视角）
  ├─ Evidence（官方、研究、外部佐证）
  ├─ Actor（公司、项目、机构）
  └─ Project transition（active / pivoted / acquired / sunset）

2022—今天
  └─ Era
      ├─ 代表事件
      ├─ 代表产品与项目
      └─ 生命周期变化
```

Track 不复制 Event。旧 `china-catch-up` 在 seed 阶段迁移为 `global-innovation`，保留已有关联；所有 curated track 引用同步替换。

## 2. 抽屉信息路径

```text
标题 + 最新时间 + 类型
  -> 已确认事实
  -> 事情如何发展（全部去重节点）
  -> 技术/产品变化
  -> 行业与商业影响
  -> 当前判断与反向信号
  -> 下一观察
  -> 原始证据 / 完整详情
```

抽屉继续按需读取 `timeline.json`，使用 `textContent` 渲染外部文本。Timeline 节点不预渲染，避免性能回退。

## 3. 星探去重

```text
published Scout
  -> normalize(title + primary evidence slug + kind)
  -> identical fingerprint: keep highest total/evidence/confidence
  -> render sorted by confidence, total, published time
```

去重只影响公开 DTO；数据库保留原始生成记录用于审计。自动发布门禁不降低。

## 4. 事件驱动公开层

```text
data-refresh (6/day)
  -> collect / cluster / auto publish
  -> export allowlisted JSON
  -> canonical public fingerprint
       changed   -> snapshot commit -> Pages dispatch
       unchanged -> snapshot commit only, no Pages dispatch
```

公开指纹只读取 allowlist DTO，递归移除 `generatedAt`、评测完成时间和来源检查时间等波动字段。Timeline、Scout、趋势叙事、公开来源状态或产品评测的实质字段改变时，指纹必须改变。

## 5. 视觉约束

- 使用统一 `--space-*`、`--content-width` 与 `--drawer-width` token。
- desktop drawer：`min(760px, 94vw)`；mobile drawer：底部 sheet，最大高度 88vh。
- `reading-journey` 与 `.shell` 同宽，不在中间断到 680px。
- Timeline 末尾保留至少 96px 内容间距，避免贴住 footer。
- Scout 标签左对齐、换行且不以 `justify-content: space-between` 承载元数据。

## 6. 星探公开池

```text
archive expired published cards
  -> count current published cards
  -> gap = max(0, 18 - current)
  -> generate min(requested batch, gap)
  -> six opportunity kinds rotate across ranked Events
  -> existing score/evidence gates
  -> public DTO fingerprint dedupe
```

Data Refresh 每轮请求 12 条候选，但只填补到 18 条公开池水位，不把运行频率直接变成内容膨胀速度。新生成卡 14 天过期；过期归档后由下一轮新事件补位。

## 7. 阶段化趋势证据

`NarrativeStage` 增加可计算时间边界和解释字段：

```text
NarrativeStage
  start / end
  period / label
  summary              阶段事实摘要
  interpretation       为什么这是一个阶段或转折
  chinaPosition        同维度中国实践
  nextSignal           下一验证或反向信号
```

静态导出按 `latestDevelopmentAt(Event)` 将同一 Track 的公开 Event 落入阶段：

```text
Track public Events
  -> sort by latest development
  -> match NarrativeStage.start <= date <= end
  -> calculate event / evidence / independent source counts
  -> concise: first 2 representative Events per stage
  -> full: every public Event in the stage
```

阶段归属采用双时间轴：`Event.happenedAt` 命中事实起点，`Evidence.publishedAt` 命中后续进展。同一 Event 可以在多个阶段出现，但每个阶段只统计和展示该阶段内发布的 Evidence；点击后仍回到唯一 Event 事实节点，禁止复制 Event。最后一个进行中阶段使用开放终点 `9999-12-31`，使未来增量自动进入当前分组而无需修改静态年份。

阶段无 Event 时保留阶段判断并明确显示“证据待补”；不得把相邻阶段事件复制过来填数。未落入任何阶段的 Event 进入“最新变化”段，避免静默丢失。

相关观察源池根据 Track 的稳定主题映射从公开 Source DTO 计算，展示 source lifecycle、region、role 和 health；它只表达未来观测能力，不计入事实证据数。

## 8. 决策镜头

`TrackNarrative` 内置四个经过人工审阅的 `DecisionLens`：

```text
role / question
answer
implications[]
actions[]
watch[]
evidenceSlugs[]
```

渲染时校验引用 Event 属于当前公开快照；引用缺失时不输出链接。默认展示 answer 和首个 watch；角色模块展开后展示完整影响链、动作和观察项。

## 9. 模块级展开与动态反馈

- 不再维护全局 density 状态或 `localStorage.agent-pulse-density`。
- 每个可展开模块使用独立的 `data-module-expand-root`、`data-module-expand` 与 `data-module-extra`，只影响自身表示层，不改变 DTO 或公开门禁。
- 阶段轨迹只有一个展开 / 收起控件，固定在模块标题栏右侧，一次控制所有阶段的补充说明；阶段卡内部不重复放置开关。
- 阶段证据与阶段轨迹复用同一组 `01 / 02 / 03…` 序号和趋势主题色，确保两区可以直接对应。
- 阶段轨迹使用原生横向滚动与 scroll snap；不劫持纵向滚动。
- 数字、进度和最新更新时间使用等宽字体；`prefers-reduced-motion` 下关闭自动脉冲与入场动画。

## 10. 唯一公开周期内容：周报 Issue

```text
Sunday final Data Refresh (Asia/Shanghai)
  -> render ISO-week summary from public DTOs
  -> marker agent-pulse-weekly-brief:YYYY-Www
  -> find issue by weekly-brief label + marker
       found -> update and reopen
       none  -> create
```

周报覆盖周一 00:00 至周日 23:59:59，按六条趋势汇总事件，附研究、行动参考、证据覆盖与下周观察。工作流手动触发时允许更新当前周，定时运行只在北京时间周日最后一个刷新窗口发布。日报 renderer、命令、测试、标签入口与 upsert 步骤全部删除；历史日报 Issue 不作为当前产品入口，也不由自动化继续更新。

## 11. GitHub Actions 与 Pages 收敛

Data Refresh 和 Source Audit 都在工作开始时导出一次公开 DTO 基线，在最终合并 `origin/main` 后再次导出并计算稳定指纹：

```text
restore -> export baseline -> fingerprint before
operate -> merge latest remote snapshot -> export final -> fingerprint after
commit operational snapshot/report
if commit changed && public fingerprint changed:
  dispatch pages.yml
```

- 快照的 append-only checks/runs 可以有序增长，但不再天然触发 Pages；
- 周报 Issue 与 Pages 解耦：周报按周更新，Pages 按公开内容变化更新；
- 人工 push 的产品代码仍由 `pages.yml` 的 push trigger 构建；
- 所有数据工作流继续共享 concurrency group，禁止 force push。
