# 小游戏厅（独立网页版）

把原有 35 款 Canvas 小游戏迁移为可在本地独立运行的 React + TypeScript + Vite 网页，首页用站内路由进入各游戏，不再跳转到外部 Canvas 页面。原版 Page 源码保存在 `archive/canvases/`，玩游戏逻辑以迁移后的 `src/games/` 为准，并尽量保持原玩法。

本项目适合之后用静态资源方式放到 Cloudflare Workers Static Assets（见根目录 `wrangler.toml` 示例）。**当前没有执行部署，也没有推送到 GitHub。**

## 环境要求

- Node.js 18 或更高版本（开发时使用 Node 22+ 亦可）
- npm（随 Node 安装即可）

在项目根目录 `/workspace/mini-arcade-standalone` 打开终端后执行下列命令。

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器：监听 0.0.0.0:5173
npm run typecheck    # TypeScript 类型检查
npm test             # 纯规则单元测试（vitest）
npm run build        # 类型检查 + 生产构建，产物在 dist/
npm run preview      # 预览 dist，默认 0.0.0.0:4173
```

开发服务器启动后，在本机浏览器打开 `http://127.0.0.1:5173/`，或在同一网络下用主机 IP 访问 `http://<主机>:5173/`。不要用 `file://` 直接打开 `dist/index.html`，站内路由需要 HTTP 服务器。

## 生产构建与部署说明

`npm run build` 会生成 `dist/`。用任意静态服务器托管该目录即可。

若之后放到 Cloudflare Workers Static Assets，需开启 SPA 回退（示例已写在 `wrangler.toml` 的 `not_found_handling = "single-page-application"`），这样刷新 `/games/tetris` 这类地址才不会 404。本仓库**不会**替你执行 `wrangler deploy`，也没有配置账号凭据。

站点按域名根路径设计（`/`）。若要放到子路径，需要同时改 Vite `base` 与 React Router 的 `basename`，当前代码未做子路径适配。

## 游戏与存档

首页列出全部 **35** 款游戏，另有加映页「TinyLang 玩具解释器」。每款游戏都在 `/games/<英文短名>`，例如 `/games/tetris`、`/games/xiangqi`。

关于存档，请以实际实现为准：

- **跳一跳**：会把最高分写到本机 `localStorage` 键 `hop-original-best`。清站点数据或换浏览器就会丢失，**不跨设备同步**。
- **外观主题**（浅色 / 深色 / 跟随系统）：写在本机 `localStorage` 键 `mini-arcade-theme`，这是界面偏好，不是游戏进度。
- **其余 34 款游戏以及 TinyLang**：进度、分数、棋局都只留在当前页面内存里，刷新或离开即丢失。

本项目**没有**做成 PWA，**没有**离线安装包，**没有**账号系统，也**没有**跨设备云存档。

## 测试范围（请勿理解为已全部深度试玩）

已覆盖的自动化检查：

- `npm run typecheck`：整个 TypeScript 项目的类型检查。
- `npm run build`：生产构建能否成功打包。
- `npm test`：从原规则中抽出的纯函数测试，包括二十一点点数与庄家 17 停牌、中国象棋蹩马腿 / 塞象眼 / 将帅照面、军棋吃子与排雷炸弹、四子棋重力与四连、泡泡龙三连消除与触底、飞行棋起飞 / 终点回退 / 撞回。

未覆盖、需要在浏览器里人工确认的部分包括但不限于：

- 各游戏在手机与桌面的实际手感、触控与键盘操作是否顺手
- 画布类游戏（弹珠台、飞行棋棋盘对齐、泡泡龙瞄准轨迹、街机射击等）的碰撞与帧循环表现
- 人机对战的体验与强度
- 深色 / 浅色主题在每一款游戏里的对比度
- 路由前进后退、刷新深链、窗口缩小后的布局
- 跳一跳最高分在刷新后是否仍能读出

不要把「构建和规则测试通过」理解成「35 款都已经深度玩法测试通过」。

## 目录说明

- `src/games/`：迁移后的游戏页面（已改为从 `../compat/grok-canvas` 引入本地兼容组件）
- `src/compat/`：不依赖 Grok 平台或网络 API 的 UI / 主题层
- `src/pages/`：首页、壳层导航、游戏路由
- `src/rules/`：供单元测试使用的纯规则模块
- `archive/canvases/`：原版 Canvas 源码归档，请勿当成运行入口

原版 Canvas 页面本身没有在这次迁移中修改。
