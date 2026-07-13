# 首页动态化、公开观察流与周更发布

状态：已发布并通过线上验收
目标版本：0.10.0
范围：首页内容编排、公开静态 DTO、周更 Actions、GitHub Issue 周报、Release 与 Pages 验收。

## 变更摘要

- 首页“最新趋势判断”从多个有公开证据的趋势方向中按刷新随机展示一个。
- “近期变化”从最新一批已发布 Event 中随机展示六条。
- 六个行业趋势块保持同时可见，每个块内部轮播该趋势下的多个最新 Event。
- 新增公开来源动态瀑布流，只输出 allowlist 字段、限长纯文本描述与原文链接，并配套 Tab 动效。
- 数据刷新改为每日一次并在成功后部署 Pages；来源审计、质量守卫与健康监控保留周计划。
- 周日刷新幂等创建或更新一个 `weekly-brief` Issue；其他日期只刷新数据和站点，不创建日报 Issue。
- 以 0.10.0 完成 README、AGENTS、Changelog、仓库元数据、Release 与线上验收。

## 文档

- [PRD.md](./PRD.md)
- [SYSTEM.md](./SYSTEM.md)
- [TEST.md](./TEST.md)
- [TASKS.md](./TASKS.md)
