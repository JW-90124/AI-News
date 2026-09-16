# 验证记录

2026-09-16，本地 Node 24.19.0，基线提交 d6ee6d0364b63b8e900c920752ce398ebdde5b08。

- lint、TypeScript typecheck、production build：通过。
- 快照存储、数据库快照、bootstrap、来源工作流：4 个文件、17 项测试全部通过。
- 仓库完整测试：344 项中 341 项通过；其余 3 项分别在 scout.test.ts、source-discovery.test.ts、integration.test.ts 中失败。以未修改的基线提交重跑这三个测试文件，同样 3 项失败（15 项通过）；并非本次变更引入。
- 静态导出与 public:validate：通过，issues 为空。CLI 使用 node --import tsx 调用，与 npm 脚本相同入口，避免本地 sandbox 禁止 tsx CLI 的 IPC socket。
- 大小与无损往返：真实仓库快照 104,423,811 字节；以 JSON 允许的尾随空白扩至 115,343,360 字节（110 MiB），不添加或删除事实记录。生成 22 个 JSON 分片，最大片 8,388,574 字节（低于 8 MiB）。还原后的规范 JSON 哈希一致，包括 15,100 个 Signal、2,624 个 Event 和 143,283 条 observation occurrence。

- 实际数据库恢复：分别从原始单文件和分片恢复到独立 SQLite，16 张快照相关表的行数全部一致。

尚未完成：远端发布、手动触发 Data Refresh / Source Audit、CI 和 Pages 云端验收。需要可用的 GitHub 写入认证；插件已启用，但当前会话未暴露 GitHub 工具，本地 Git/gh 尚未登录。
