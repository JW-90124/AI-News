# 实施清单

## 本轮 Stage 2 foundation

- [x] 审视当前真实水位并冻结 Stage 1-5 演进模型
- [x] 重写项目级 AGENTS.md，纳入使命、主线、数据源治理、星探和演进约束
- [x] 增加来源 lifecycle、health、policy schema 和 SourceRun
- [x] 实现结构化 FetchError、条件请求、重试/退避/Retry-After
- [x] 实现有界并发和单源运行记录
- [x] 实现自动健康 reducer 与人工 lifecycle action
- [x] 增强后台来源运营控制面基础能力
- [x] 增加 ScoutInsight / ScoutEvidence schema
- [x] 实现证据型 Scout v1、冷却去重和状态流转
- [x] 增加星探管理 API、管理台和静态公开组件
- [x] 补齐本轮单元、SQLite 集成与导出验收
- [ ] 补齐真实浏览器 UI 与 MySQL 集成验收
- [x] 更新 README/架构/来源文档
- [x] 建立 100+ 高价值 Source Catalog 与覆盖分类
- [x] 建立 State 1–5 Roadmap，每个 State 至少 3 个里程碑
- [x] 建立 Capability Map、版本化 Changelog 与公开 Evolution Spine
- [x] 建立多维 Evaluation Scorecard、evaluation_runs 与后台评测中心
- [x] 删除本地空目录并将来源/产品目录收敛到 `src/catalog/`
- [x] 推送并验证 CI / Pages，发布 v0.1.0 与 v0.2.0 GitHub Releases

## Stage 2 后续运营验证

- [ ] 为核心来源建立 adapter contract fixtures 和 7/30 天 SLO
- [ ] 增加 scheduler、per-host token bucket、fallback endpoint 和告警
- [ ] 建立候选来源发现、影子评估、价值/成本评分和退役复盘
- [ ] 用 accepted/dismissed/published 反馈评估星探 precision 与长期价值

## Stage 3-5

- [ ] Stage 3：Entity / Claim / Evidence / Contradiction 图谱与多语言语义聚类
- [ ] Stage 4：关注组合、情景推演、领先指标、预测登记与校准
- [ ] Stage 5：受治理的来源自发现、adapter 提案、agent 调研和实验系统
