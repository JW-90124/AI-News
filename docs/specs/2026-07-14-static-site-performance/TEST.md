# 测试方案

## 静态导出

- CSS、核心脚本和 Timeline JSON 满足体积上限。
- 所有公开 JSON 可正常解析，且不再包含格式化缩进。
- 每个页面只引用一次 `core.js`，引用位于 Head。

## 加载行为

- 核心脚本包含空闲调度逻辑。
- 来源动态全量数据不会在首屏自动请求；搜索、地域筛选和加载更多才触发请求。
- 行情组件具备 `IntersectionObserver` 与一次性加载标记。
- 事件抽屉仍保持点击后加载 Timeline。

## 地域控件

- 中文页包含“按地域筛选”的原生 select、`.signal-region-control` 与 chevron 图标。
- 窄屏下工具栏保持单列。

## 验证命令

```bash
npm run check
npm run build
```

## 2026-07-14 验收结果

- `npm run check` 通过：46 个测试文件、289 项测试全部通过，静态导出成功。
- `npm run build` 通过。
- CSS：104,700 B -> 85,970 B；核心脚本：33,215 B -> 26,223 B。
- Timeline JSON：433,658 B -> 329,023 B；Sources JSON：178,812 B -> 137,693 B。
- Signals JSON 当前为 1,807,121 B；本地冷启动请求日志确认来源动态首屏不再请求该文件，只加载 HTML、CSS、核心脚本、图标与 favicon。
- 1440 × 1000 Headless Chrome 截图确认地域选择控件与搜索框等高、箭头和主题色正确，首屏卡片正常呈现。
