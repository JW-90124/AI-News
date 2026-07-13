# PRD：再扩展 100 个可验证信源

## 1. 背景

上一轮目录扩张把来源数提升到 258，并通过真实审计确认 120 个 effective 来源、104 个 E3 隔离采集来源。当前目录仍偏重单一工程 Release，宏观、政策、研究机构、资本与中国开源生态的结构化覆盖不足；同时来源页以逐行目录为主，用户难以快速判断来源组合是否均衡。

## 2. 目标

1. 在当前 catalog 基线上精确新增 100 个不重复来源：
   - 30 个 Agent、SDK 与协议来源；
   - 25 个模型工程、评测、数据与基础设施来源；
   - 15 个中国开源产品与工程来源；
   - 10 个机器人与视觉来源；
   - 20 个官方研究、产业、政策与资本 Feed。
2. 新来源全部从 `shadow` 开始；目录登记不等于已验证、已观察或已投产。
3. 对新增来源执行真实 source audit；只有本轮返回合法条目、质量不低于 60、内容足够新鲜的来源才允许进入 E3。
4. 对 E3 来源执行一次隔离采集，写入 Signal 与 observation，不直接补强公开 Event。
5. 来源页增加组合视图，按领域、地区、采集通道和运行状态展示来源结构，而不是只展示总数和长列表。

## 3. 非目标

- 不批量晋级 E4 active；仍需 20 次 healthy、至少 7 天窗口和既有自动契约。
- 不绕过登录、WAF、CAPTCHA、付费墙或平台限制。
- 不因为目录数量增长而降低 Event readiness、来源独立性或公开证据门禁。
- 不把 broad Feed 的每条内容自动升级为行业 Event。
- 不在本轮实现 0.9.0 的 `InvestmentThesis`、行情或估值对象。

## 4. 成功口径

```text
cataloged  = 有身份、端点、分类、许可说明与 adapter 配置
healthy    = 实时抓取成功且返回合法内容
effective  = healthy + quality >= 60 + 至少一条有效内容
observing  = effective + freshness 门禁，通过 E3 隔离采集
active     = 20 次 healthy + 7 天跨度 + 自动契约门禁
```

验收时必须分别报告新增 100 个来源中的 healthy、effective、observing、failed、manual/restricted 数量，以及实际新增 Signal 数量。
