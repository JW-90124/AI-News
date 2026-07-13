# 系统设计

## 1. 数据流

```text
100-source manifest
  -> seed/upsert as shadow
  -> live source audit
       -> healthy/effective -> E3 eligibility
       -> failed/degraded   -> remain shadow with repair evidence
       -> restricted/manual -> policy skip
  -> isolated collection
       -> Signal + observation
       -> existing dedupe / quality / eventability gates
       -> no direct public Event promotion
  -> snapshot/export
  -> source portfolio + runtime catalog
```

## 2. 来源清单

新增清单放在独立的 `src/catalog/source-expansion-2026-07.ts`，避免继续扩大主目录文件中的手写元组。清单仍产出既有 `CatalogSource`，不引入第二套 Source 模型，也不改变 `SourceAdapter` 契约。

所有新增自动来源使用既有 `rss` 或 `github-releases` adapter：

- GitHub Release Feed 仅保存 release 标题、链接、摘要片段、时间与 provenance；
- RSS/Atom 仅保存公开元数据和摘要，不复制完整正文；
- endpoint 在进入清单前必须通过实时条目探测，正式健康状态仍以仓库 source audit 为准。

## 3. 隔离与噪声控制

- `enabled=false`、`lifecycleStatus=shadow`、`maintenanceStatus=candidate`；
- 只有 `observe:sources --confirm` 明确选中的来源进入 E3；
- E3 Signal 保留 `observation` provenance，不能直接成为公开事实；
- broad policy/capital Feed 继续经过现有质量、聚类、eventability 和 readiness 门禁；单一泛化条目不能发布；
- 同一机构的 Feed 与 Release 是不同采集通道，不应被解释为两个独立机构。

## 4. 公开呈现

来源页在现有技术覆盖卡片之前增加来源组合视图：

- 领域：按 category 聚合，并显示 healthy / observing 数；
- 地区：中国、全球、美国、欧洲及其他；
- 通道：RSS/Atom、GitHub Release、API、HTML、manual/social；
- 状态：healthy、degraded、failed、skipped、unchecked。

组合视图完全由公开 `PublicSource` DTO 计算，不暴露 endpoint、错误详情、数据库字段或原始 payload。

## 5. 回滚

- 新清单是独立数组，可从 `sourceCatalog` 中整体移除；
- seed 为幂等 upsert，不删除历史 provenance；
- E3 可通过既有 observation 开关停用；
- 页面组合视图只读，不改变采集或发布状态。
