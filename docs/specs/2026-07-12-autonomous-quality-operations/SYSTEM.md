# 系统设计

## 1. 自主运营流程

```text
source audit
  -> adapter recovery / feed fallback
  -> latest health persisted
  -> lifecycle reconcile
       healthy shadow -> observation
       repeated active failure -> degraded
       repeated degraded failure -> quarantined
  -> collect eligible sources
  -> discovery triage
       known identity -> matched
       existing signal -> merged
       strong unknown -> disabled draft proposal
  -> cluster / readiness preparation
  -> scout inbox generation
  -> evaluate / monitor / export
```

所有步骤幂等，单来源失败不终止整批任务。公开发布不在该自动链路内。

## 2. 来源抓取与生命周期

`web-scraper` 在 HTML 提取结果全部缺少可信日期时仍尝试页面声明的 RSS/Atom，并优先保留 feed 结果。来源生命周期统一使用既有失败计数和 transition contract，不直接绕过规则写状态。

晋级使用统一资格：最近检查健康、至少 20 次健康检查且观察窗口达到 7 天。旧的“一次健康即激活”和“3 次/1 天”路径移除。

## 3. 来源雷达

雷达自动推进分三层：

1. 精确 URL / root domain / 已有 source identity 自动标记 matched；
2. 已被 signal 消费的发现自动标记 merged_signal；
3. 通过安全 URL、独立证据数和来源角色门槛的未知域生成 disabled draft proposal。

低置信度、共享平台、聚合站自身 URL 和许可不明候选保留待审，不自动进入 shadow/active。

## 4. 星探动态生成

候选池先按价值排序，再逐项检查 `kind:event` 冷却键，直到产生本轮上限或耗尽候选池。kind 根据历史计数轮转，避免每轮固定前三个事件。新建议只进入 inbox；过期建议在前台不再作为新鲜信号展示。

## 5. 后台操作契约

来源列表返回 operation readiness：

- action 是否允许；
- 禁用原因；
- 最近检查状态、健康检查数和观察天数；
- 推荐下一步。

前端为每个来源维护 busy 状态，成功后刷新来源、检查记录和统计；409/422 展示服务端具体原因，不再只显示“操作失败”。

## 6. 评测与 Actions

评分函数继续只消费真实证据。Actions 输出机器可读评测、来源健康报告和质量摘要，并保留 80 分目标。证据不足时 workflow 预警而非篡改评分；达到稳定样本后再把目标升级为硬门禁。

Actions 分工：

- CI：代码、测试、静态安全和 workflow 校验；
- Source audit：审计、生命周期协调、观察模式和健康 issue；
- Data refresh：采集、聚类、雷达推进、星探生成、评测、导出和快照；
- Monitor：只读健康检查与告警，不修改业务数据。
