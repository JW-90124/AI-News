# 每日 AI 日报推送 · 配置指南

本 fork 在 agent-pulse 原有流水线之上增加了两个文件：

- `scripts/daily-push.mjs` — 读取每日导出的事件数据，生成日报并推送
- `.github/workflows/daily-push.yml` — 每天北京时间 21:30 自动运行（在上游 20:17 数据刷新之后）

每天产出两样东西：

1. **企业微信图文卡片消息** → 通过"微信插件"直达你的个人微信，每条卡片点开是事件的原始信源
2. **公众号排版草稿** → 提交到仓库 `digests/日期.html`（内联样式，可直接粘贴进公众号编辑器）和 `digests/日期.md`（纯文本备份）

---

## 一次性配置步骤

### 第 1 步：Fork 仓库

1. 打开 https://github.com/barretlee/agent-pulse ，点右上角 **Fork**
2. Fork 完成后，把本目录中新增的三个文件（`scripts/daily-push.mjs`、`.github/workflows/daily-push.yml`、`PUSH_SETUP.md`）提交到你的 fork
3. 在你的 fork 页面 → **Settings → Actions → General** → 确认 "Allow all actions" 且 Workflow permissions 选 **Read and write permissions**
4. 在 **Actions** 标签页点 "I understand my workflows, enable them"（fork 默认禁用定时任务）

### 第 2 步：注册企业微信并创建应用

1. 打开 https://work.weixin.qq.com → 立即注册 → 选"其他组织"，填个名字（如"我的AI日报"），微信扫码验证即可，**不需要营业执照**
2. 登录管理后台 https://work.weixin.qq.com/wework_admin/
3. **应用管理 → 自建 → 创建应用**，名字随意（如"AI日报"），可见范围选你自己
4. 记下三个参数：
   - **企业 ID**：我的企业 → 企业信息 → 最底部"企业ID"
   - **AgentId** 和 **Secret**：应用管理 → 点进你刚建的应用页面里查看
5. **配置可信 IP**（应用页面 → 开发者接口 → 企业可信IP）：GitHub Actions 的出口 IP 不固定，
   最省事的方式是应用页面里关闭 IP 校验相关限制；若必须填写，可先手动触发一次 workflow，
   从报错信息 `from ip: x.x.x.x` 中把 IP 加进去（IP 变化时需要再加）。

### 第 3 步：开启微信插件（让消息进你的个人微信）

1. 管理后台 → **我的企业 → 微信插件**
2. 用你的**个人微信**扫码关注
3. 在"允许成员在微信插件中接收和回复聊天消息"处打勾

### 第 4 步：在 GitHub 配置密钥

你的 fork 页面 → **Settings → Secrets and variables → Actions → New repository secret**，添加三条：

| Secret 名称 | 值 |
|---|---|
| `WECOM_CORP_ID` | 第 2 步的企业 ID |
| `WECOM_AGENT_ID` | 第 2 步的 AgentId |
| `WECOM_APP_SECRET` | 第 2 步的 Secret |

### 第 5 步：手动触发验证

fork 页面 → **Actions → Daily WeChat digest push → Run workflow**。
一两分钟后你的微信应该收到当天的日报卡片；仓库 `digests/` 目录出现当天的 html/md 草稿。

---

## 日常使用

- **看日报**：每天 21:30 左右微信收到卡片，点卡片直达原始信源
- **发公众号**（注册公众号之后）：打开仓库 `digests/当天日期.html`，
  用浏览器打开该文件 → 全选复制 → 粘贴到公众号编辑器 → 群发。
  样式为内联 CSS，公众号编辑器可直接识别
- **调整数量/窗口**：`daily-push.yml` 的 env 中可设 `DIGEST_MAX_EVENTS`（默认 8）、
  `DIGEST_WINDOW_HOURS`（默认 26）

## 跟随上游更新

本方案没有改动上游任何文件，只新增了文件，因此同步上游更新不会冲突：
fork 页面点 **Sync fork → Update branch** 即可。
