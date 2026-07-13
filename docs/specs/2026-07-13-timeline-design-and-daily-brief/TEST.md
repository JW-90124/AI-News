# 测试方案

## 数据与文案

- 六个战略方向 slug、名称和叙事唯一且一致。
- 全部公开源码文案不包含“中国追赶”或 `China catch-up`。
- 2022 和 2023 curated Event 均有 Tier 1 URL、完整判断字段与趋势关联。
- 项目生命周期状态只允许 `active/pivoted/acquired/sunset`，并有官方 URL。

## 页面

- Timeline 不渲染 `.timeline-intelligence`、近三月密度或论文批次状态。
- 趋势目录和首页六张卡均包含详情按钮。
- 阶段轨迹包含连接箭头和可访问的阶段顺序。
- 筛选显示“官方发布”，不显示“一手证据”。
- 抽屉包含事实、发展、变化、影响、判断、下一观察和证据区；不截断到 4 个节点。
- 390px 下抽屉、Timeline、Scout 标签和 reading journey 无横向溢出。

## 星探

- 相同标题/事件/类型只输出一次，保留得分最高的版本。
- 不同类型的有效机会不被误去重。
- 标签左对齐且第三个指标始终可见。

## 事件驱动发布与周报

- 全站静态 HTML、导航、SEO 和订阅区不包含每日认知承诺、固定 10 分钟承诺或日报入口。
- `daily:issue`、daily renderer、daily test 和 `agent-pulse-daily-brief` workflow marker 均不存在。
- 周报 renderer 只消费 allowlist JSON，转义 Issue Markdown 控制字符并限制条数。
- 同周 marker 幂等更新，不重复建 Issue；跨周创建新 Issue。
- 周报没有新 Event 时明确“当前判断未变”，不制造趋势变化。
- 公开内容 fingerprint 对 key 顺序和 `generatedAt` 稳定，对 Event/Scout/趋势实质变化敏感。
- Data Refresh 与 Source Audit 只有在 `public_changed=true` 时 dispatch Pages。

## 回归

- `npm run check`
- `npm run build`
- YAML 解析、静态隐私扫描、关键页面 HTTP/内容 smoke
- GitHub Actions 真实运行、周报 Issue 和按需 Pages 验收

## 追加回归（v0.8.1）

- 首页桌面端 `.home-intro` 为标题 + 紧凑阅读路径双列，820px 以下回到单列。
- 趋势总览标题下渲染六个 `.line-nav` 入口，且不再渲染旧三个状态标签。
- 星探六种 kind 都能生成完整卡片，并继续通过统一发布门禁。
- 公开池不足 18 条时按请求批次补位，达到 18 条时创建数为 0；过期 published 卡先归档。
- Data Refresh 使用 12 条候选批次，公开 DTO 仍无标准化标题重复。

## 高密度趋势与订阅回归（Unreleased）

- 首页首屏直接从 `LATEST MATERIAL SHIFT` 开始，不再渲染 `.home-intro` 与 `.reading-journey`；全站 `.section-head` 不包含右侧说明 `<p>`。
- 趋势总览使用“六个视角”，导航不再增加“选择 / 切换趋势”标题；详情顶部是轻量横向列表，主要 section 标题保持短句。
- 阶段证据不展示 Event / Evidence / Source 统计仪表；订阅入口以 Watch / AI 周报两个链接并入 Footer。
- 默认状态下，每个阶段保留两个默认证据节点，并提供“查看全部证据 / 收起证据”的局部展开能力。
- 首页顶部以简短产品说明和小节点证据网络介绍产品，不展示大面积实心球；首个内容模块展示趋势阶段、当前判断、变化原因、三条证据与下一信号。
- “关键角色”卡片等高且不重复展示收录提示；行动参考只展示行动参考、关键角色和模型成本三个 Tab，不展示判断方法入口。
- 首页不展示“形成判断 / 继续深入”模块；趋势总览不展示“理解框架”；趋势详情不展示“证据缺口”。
- Footer 使用品牌、Watch / 周报、探索 / 更多分组导航与独立元信息层，并承接关键角色和模型成本入口。
- Footer 使用浅暖灰渐变、细线轨道装饰和宽松留白，不使用整块纯深色背景；证据状态不出现“单一官方资料”等内部术语。
- Timeline 每个年份左侧同时展示当前月份，滚动进入另一个月时通过 `IntersectionObserver` 更新月份文本。
- 四个主入口右上角分别展示不同的轻量 SVG 动效；语言切换只在 Footer 展示，链接聚焦时不出现 outline 外框。
- 趋势判断首页与详情页均只展示 6 个可点击 `.trend-tab`；首页默认选中“模型能力与研究”，详情页选中当前趋势，移动端 Tab 容器可横向滚动且页面本身不溢出。
- “行业演化”使用独立静态页面，不出现在六个视角 Tab 中，只从 Footer 提供入口。
- 趋势详情 HTML 不包含“中国实践”独立模块或阶段内中国实践字段。
- 首页不展示“本周研究”；六张行业趋势卡均为整卡链接，并有清晰悬停和方向反馈。
- Timeline 横向筛选项点击或由 URL 参数选中后，使用 `scrollIntoView({ inline: "center" })` 滑动到容器中部。
- 六条趋势阶段数为 5—8 且不全部相同；每阶段有 start、end、interpretation、nextSignal。
- 阶段轨迹在 1440px、820px 和 390px 均保持单行，容器可横向滚动且无页面级横向溢出。
- 默认每阶段最多展示 2 个 Event；阶段模块展开后没有旧版 7 条全局上限，并显示 Event、Evidence 和独立来源计数。
- 页面不显示全局展示模式；阶段轨迹、阶段证据、角色判断与观察源池各自展开和收起。
- 阶段轨迹只在模块标题栏右侧显示一个整块展开 / 收起按钮，阶段卡内部不重复显示开关。
- 阶段证据标题复用阶段轨迹的序号、主题色与周期映射。
- 证据按阶段分组；阶段解读、事实证据和观察源池在文案与 DOM 上明确分开。
- 四个 DecisionLens 都含 answer、implications、actions、watch 和有效 evidenceSlugs。
- 密度模式可通过键盘切换并在刷新后从 localStorage 恢复；无 JavaScript 时全量证据仍存在于 HTML。
- 全站订阅模块只包含 Watch 和周报入口，不把 Star 描述为订阅。
- 周报 renderer 只消费 allowlist DTO，按 Asia/Shanghai ISO 周过滤，marker 幂等且 Markdown 安全。
- Data Refresh 每天运行并刷新 Pages，但只在周日最后一个刷新窗口或手动触发时 upsert `weekly-brief` Issue。
- 旧 Event 获得新 Evidence 时，Event 同时保留在事实起点阶段并进入证据发布日期对应阶段；两个阶段的 Evidence 和 Source 计数互不串位。
- 进行中阶段为开放区间，未来日期的增量 Evidence 无需修改阶段配置即可正确归组。
- 紫色实心按钮统一使用白色文字；行动参考页所有 `.section.shell` 的 `padding-block` 为 0。
