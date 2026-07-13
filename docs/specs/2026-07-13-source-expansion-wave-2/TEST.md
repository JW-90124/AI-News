# 测试方案

## 1. 目录契约

- 新增数组精确包含 100 个来源；
- slug 在全目录中唯一；本轮新增 endpoint 在新增清单中唯一；
- 全部新来源为 disabled + shadow + candidate；
- acquisition 只能为 `github` 或 `rss`，adapter 必须与之匹配；
- 每个来源包含 region、category、topics、cadence 与 license note；
- 中国、机器人、Agent、基础设施和非 GitHub Feed 数量达到 PRD 配额。

## 2. Adapter 契约

- 复用既有 GitHub Release 与 RSS fixture 的成功、304、空 Feed、schema drift 和失败路径；
- full source audit 对每个新增来源产生 check；
- 空结果、非法日期、重复率过高或质量不足不能成为 healthy。

## 3. 隔离采集

- 新来源单次 healthy 不会晋级 active；
- 只有符合 E3 门禁的来源可进入隔离采集；
- 采集写入 Signal/observation，不直接发布 Event；
- 单来源失败不终止整批采集，cursor/ETag 失败时不错误推进。

## 4. 页面与隐私

- 来源组合视图的总数与 `model.sources` 一致；
- 分类、地区、通道和健康状态统计可由公开 DTO 复算；
- 页面保留“收录不等于有效观测”的状态说明；
- 静态导出不包含 endpoint、token、数据库路径、原始 payload 或私有备注。

## 5. 完整验收

```bash
npm test -- tests/catalog.test.ts tests/collectors/github-releases.test.ts tests/collectors.test.ts tests/static-site-intelligence.test.ts
npm run sources:audit -- --concurrency=4 --report=data/reports/source-health.json
npm run observe:sources -- --confirm
npm run collect -- --scope=eligible
npm run check
npm run build
```
