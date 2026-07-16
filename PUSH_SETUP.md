# 每日 AI 日报推送 · 配置指南

本 fork 在 agent-pulse 原有流水线之上增加了两个文件：

- `scripts/daily-push.mjs` — 读取每日导出的事件数据，生成日报并推送
- `.github/workflows/daily-push.yml` — 每天北京时间 21:30 自动运行（在上游 20:17 数据刷新之后）

每天产出两样东西：

1. **企业微信群机器人图文卡片** → 推送到你企业微信里的日报群，每条卡片点开是事件的原始信源
2. **公众号排版草稿** → 提交到仓库 `digests/日期.html`（内联样式，可直接粘贴进公众号编辑器）和 `digests/日期.md`（纯文本备份）

---

## 一次性配置步骤

### 第 1 步：Fork 仓库

1. 打开 https://github.com/barretlee/agent-pulse ，点右上角 **Fork**
2. Fork 完成后，把本目录中新增的三个文件（`scripts/daily-push.mjs`、`.github/workflows/daily-push.yml`、`PUSH_SETUP.md`）提交到你的 fork
3. 在你的 fork 页面 → **Settings → Actions → General** → 确认 "Allow all actions" 且 Workflow permissions 选 **Read and write permissions**
4. 在 **Actions** 标签页点 "I understand my workflows, enable them"（fork 默认禁用定时任务）

### 第 2 步：注册企业微信

打开 https://work.weixin.qq.com → 立即注册 → 选"其他组织"，填个名字（如"我的AI日报"），
微信扫码验证即可，**不需要营业执照**。手机也安装"企业微信"App 并登录（日报在这里收）。

### 第 3 步：创建群机器人（拿 Webhook 地址）

> 为什么用群机器人：自建应用的 API 要求配置"可信 IP + 备案域名"，个人主体无法满足，
> 而且 GitHub Actions 的 IP 每次都变。群机器人是官方提供的推送通道，没有这些限制。

1. 在企业微信 App（手机或电脑客户端均可）里**发起群聊**，只选自己，建一个单人群，
   群名随意（如"AI日报"）
2. 进入群 → 右上角群设置 → **群机器人 → 添加机器人 → 新创建一个**，名字如"日报推送"
3. 创建后会得到一个 **Webhook 地址**（`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...`），
   复制它。**这个地址等同于密钥，不要泄漏**

### 第 4 步：在 GitHub 配置密钥

你的 fork 页面 → **Settings → Secrets and variables → Actions → New repository secret**，添加一条：

| Secret 名称 | 值 |
|---|---|
| `WECOM_WEBHOOK_URL` | 第 3 步的完整 Webhook 地址 |

### 第 5 步：手动触发验证

fork 页面 → **Actions → Daily WeChat digest push → Run workflow**。
一两分钟后企业微信的日报群里应该收到当天的日报卡片；仓库 `digests/` 目录出现当天的 html/md 草稿。

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
