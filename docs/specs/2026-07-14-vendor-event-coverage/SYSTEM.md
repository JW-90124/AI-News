# 系统设计

## 数据流

```text
官方发布记录 / 模型文档 / GitHub Atom
  -> Source Catalog (shadow)
  -> source audit / isolated observation
  -> Signal candidates
  -> existing clustering + readiness gates

人工核验的关键版本与公司节点
  -> CuratedEventSeed
  -> Event + primary evidence
  -> public Timeline DTO
  -> data-search aliases
  -> 事件脉络检索与详情页
```

## 覆盖矩阵

`vendor-coverage.ts` 是最低覆盖约束，而不是展示用排行榜。它把 22 家重点厂商的中英文别名、模型品牌和官方来源入口连接起来；契约测试要求每家厂商至少存在一个可检索 Event。新增重点厂商时必须同时补来源和事件，不能只登记目录。

覆盖范围包括：

- 全球：OpenAI、Anthropic、Google / Gemini、Meta / Llama、xAI / Grok、Mistral、Cohere、Perplexity；
- 中国：DeepSeek、Qwen、字节 Seed / 豆包、腾讯混元、百度文心、智谱 GLM、MiniMax、Kimi、阶跃星辰、零一万物、百川、面壁 MiniCPM、商汤日日新、讯飞星火。

## 来源结构

xAI / Grok：

- 官方 API Release Notes 与模型目录；
- Grok-1、Python SDK、Cookbook 的官方 GitHub Atom Feed；
- 既有 xAI News 保留为人工核验入口，不尝试绕过 403。

智谱 / Z.ai：

- 官方模型 Release Notes 与模型文档；
- GLM-4、GLM-5、GLM-V、GLM-OCR、GLM Skills 的官方 GitHub Atom Feed。

扩展厂商：

- Meta、Mistral、腾讯、百度、阶跃、零一万物、百川、面壁与 Kimi 使用官方 GitHub Atom；
- Cohere、Perplexity、字节 Seed、商汤、讯飞与 MiniMax 使用官方发布或文档页面；
- 既有官方来源继续参与覆盖，不为凑数量复制同一机构身份。

同一厂商的多个入口共享 `identityHosts`，页面不得把它们解释为多个独立机构。

## 事件与检索

新增 Event 独立保留版本发布、产品化、企业分发、资本与开源节点。搜索继续复用现有 `title + company + factSummary + keywords` 索引，不引入第二套搜索模型；别名直接进入公司名和关键词。覆盖测试复用同一语义范围，避免测试通过但前台仍搜不到。

## 发布与回滚

- 新来源位于独立 manifest，可整体移除，不影响既有 100-source Wave 2。
- 新事件位于独立 curated history 文件，通过既有 seed 幂等写入。
- 静态导出仍只输出 allowlist DTO，不输出 endpoint、错误详情或原始 payload。
