# 系统设计

## 导出路径

```text
可读源文件
  -> copy web/public
  -> esbuild 压缩 CSS / JS
  -> 紧凑 JSON 序列化
  -> 静态 HTML 与资源目录
```

源文件保持可读，压缩只发生在 `dist`。JavaScript 不压缩标识符，既减少空白和可折叠语法，也保留可诊断函数名。

## 浏览器加载路径

```text
HTML Head
  -> CSS
  -> type=module 核心脚本提前下载

DOMContentLoaded
  -> 页面基础交互

interaction / idle / near viewport
  -> 搜索、地域或加载更多时请求全量 signals.json
  -> 空闲时请求 GitHub Stars 回退数据
  -> TradingView 行情组件
```

事件抽屉继续只在用户打开 Event 时请求 `timeline.json`。来源动态保留首屏 48 条静态 HTML，因此全量 JSON 只在搜索、切换地域或加载更多时请求，不影响无脚本阅读和首屏内容。

## 长列表

来源目录行使用 `content-visibility: auto` 与稳定的固有高度提示。浏览器可以跳过视口外行的布局和绘制，同时保留完整 HTML、搜索属性和无脚本可访问性。

## 地域选择控件

继续使用原生 `select`，外层只负责视觉边框和箭头。控件使用 `appearance: none`、主题变量、`focus-within` 和不可点击的 SVG 箭头，不用自制菜单替代浏览器的键盘与辅助技术能力。
