# 测试方案

## 来源契约

- 两个新 manifest 合计精确包含 27 个来源，slug 与 endpoint 唯一。
- 全部来源为 Tier 1、primary、disabled、shadow、candidate。
- 17 个 Atom Feed 使用 `rss` adapter；10 个官方页面使用 `web-scraper`。
- 同一机构的多个来源共享 identity hosts，不制造虚假独立来源数。

## Event 契约

- 新增 32 个 Event，slug 唯一；智谱与 Grok 18 个，扩展厂商 14 个。
- 每条 Event 均有 HTTPS 官方 URL、heat=0、完整判断字段和至少 4 个别名关键词。
- `source` 必须存在于 Source Catalog，且不是 aggregator。
- 22 家重点厂商全部至少关联两个官方来源入口和一个可检索 Event。

## 静态页面

- `timeline/index.html` 包含全部 32 个新增 Event。
- `data-search` 同时包含中英文厂商、模型与产品别名。
- `timeline.json` 包含全部新增 slug，代表性详情页可生成并回链原始证据。

## 验证命令

```bash
npm test -- tests/catalog.test.ts tests/history.test.ts tests/integration.test.ts
npm run export
npm run check
npm run build
```

## 2026-07-14 验收结果

- 27 个新增端点全部返回 200 与有效正文；其中 24 个通过 Node 直接请求，xAI 文档与 Perplexity 文档 3 个入口通过 curl 复核。
- `npm run check` 通过：46 个测试文件、289 项测试全部通过，静态导出生成 109 个 Event 与 293 个 Source。
- `npm run build` 通过。
- 导出后检索统计：Grok 10 个 Event、智谱 / GLM 8 个 Event；扩展厂商均至少有 1 个 Event 进入 Timeline。
