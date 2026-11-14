# 小游戏厅（独立网页版）

把原有 Canvas 小游戏迁移为可在本地独立运行的 React + TypeScript + Vite 网页，首页用站内路由进入各游戏，不再跳转到外部 Canvas 页面。原版 Page 源码保存在 `archive/canvases/`，玩游戏逻辑以迁移后的 `src/games/` 为准，并尽量保持原玩法。另有后加的「双人对战俄罗斯方块」和「房间号联机五子棋」，通过 Cloudflare Worker 与 Durable Object 提供房间号联机。

本项目按 Cloudflare Workers Static Assets 托管（见根目录 `wrangler.toml`）。仓库计划放在 GitHub 私有库，站点本身部署后会通过 `*.workers.dev` 公开访问；源码仍保持私有。本说明不承诺已接通自动部署：只有在 Cloudflare Workers Builds 明确连接该仓库并成功出过构建之后，才能视为推送后自动发布。

## 环境要求

- Node.js 18 或更高版本（开发时使用 Node 22+ 亦可）
- npm（随 Node 安装即可）

在项目根目录 `/workspace/mini-arcade-standalone` 打开终端后执行下列命令。

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 仅前端开发服务器：监听 0.0.0.0:5173（不含联机房间）
npm run typecheck    # TypeScript 类型检查（含 Worker）
npm test             # 纯规则单元测试（vitest）
npm run build        # 类型检查 + 生产构建，产物在 dist/
npm run preview      # 预览 dist，默认 0.0.0.0:4173
npm run dev:worker   # 先 build 后再用：wrangler dev 在 8787 同时提供静态页和 /api
```

开发服务器启动后，在本机浏览器打开 `http://127.0.0.1:5173/`，或在同一网络下用主机 IP 访问 `http://<主机>:5173/`。不要用 `file://` 直接打开 `dist/index.html`，站内路由需要 HTTP 服务器。

只跑 `npm run dev` 时，联机房间接口不可用（页面会提示错误；对战俄罗斯方块还可改用同屏双人，联机五子棋请改用本地「五子棋」）。要在本地联机，请先构建再启动 Worker：

```bash
npm run build
npx wrangler dev --port 8787
```

然后打开 `http://127.0.0.1:8787/`。这个进程会同时托管 `dist/` 静态资源和 `/api/tetris-vs/*`、`/api/gomoku-vs/*`（含 WebSocket）。若仍要使用 Vite 热更新，需另开一个终端运行 `npx wrangler dev --port 8787`，Vite 会把 `/api` 代理过去。

## 生产构建与部署说明

`npm run build` 会生成 `dist/`。用任意静态服务器托管该目录即可。

部署到 Cloudflare Workers 时，`wrangler.toml` 已设置 `assets.directory = "./dist"`、`not_found_handling = "single-page-application"`，并用 `run_worker_first = ["/api/*"]` 只把接口交给 Worker；刷新 `/games/tetris` 这类深链仍会回退到 `index.html` 而不是 404。双人对战房间由 Durable Object 类 `TetrisVsRoom` 与 `GomokuVsRoom`（均为 SQLite 存储，迁移标签分别为 v1 / v2）按房间号路由。账号凭据不要写入仓库。本地或 CI 在 `npm run build` 之后执行：

```bash
npx wrangler deploy
```

Worker 名称是 `mini-arcade`。若账户已启用 workers.dev 子域，预期公开地址为 `https://mini-arcade.036x.workers.dev/`（以部署命令或控制台返回的 URL 为准）。这是公开站点，不含付费套餐升级。

站点按域名根路径设计（`/`）。若要放到子路径，需要同时改 Vite `base` 与 React Router 的 `basename`，当前代码未做子路径适配。

## 游戏与存档

首页列出全部 **47** 款游戏，另有加映页「TinyLang 玩具解释器」。每款游戏都在 `/games/<英文短名>`，例如 `/games/tetris`、`/games/tetris-vs`、`/games/gomoku-vs`、`/games/xiangqi`。

**双人对战俄罗斯方块**（`/games/tetris-vs?room=房间号`）：单机俄罗斯方块仍保持原玩法，对战是单独一款。创建房间会得到 5 位房间号和可复制链接；对方输入号码或打开链接加入，双方都点「准备」后开局。各用一块 10×20 场地，同一套种子七袋方块；消 2 / 3 / 4 行分别给对方加 1 / 2 / 4 行垃圾（锁定后才堆上）。先顶出者判负，几乎同时顶出则平局。房间最多两人。联机需要本项目的 Worker / Durable Object，用上面的 `wrangler dev` 在本地跑；没有 Worker 时页面会说明错误，也可改用同屏双人（两套键盘）。成绩只留在当次对局里，不上云。

**房间号联机五子棋**（`/games/gomoku-vs?room=房间号`）：本地「五子棋」（双人/人机，可悔棋）保持原玩法，联机是单独一款。创建房间会得到 5 位房间号和可复制链接；对方输入号码或打开链接加入，双方都点「准备」后开局。十五路棋盘，先进入房间的执黑、后加入的执白，黑方先行；横、竖、斜连五或以上即胜，自由规则、不设禁手，棋盘下满则为和棋。只轮到自己时可在空交叉点落子，由服务器判定胜负，不提供悔棋。再赛需双方再次准备，座位不变。房间最多两人。联机接口为 `/api/gomoku-vs/rooms`、`/api/gomoku-vs/rooms/:code` 与 WebSocket `/api/gomoku-vs/ws?room=房间号`，同样需要用上面的 `wrangler dev` 在本地跑；没有 Worker 时页面会说明错误。成绩只留在当次对局里，不上云。

**庭院防线**（`/games/yard-defense`）、**弹射工坊**（`/games/sling-workshop`）、**滚球历险**（`/games/roll-quest`）、**街区突围**（`/games/street-rush`）、**弯道冲刺**（`/games/curve-sprint`）、**战术草稿**（`/games/tactic-sketch`）、**小场争锋**（`/games/pitch-clash`）、**街巷快送**（`/games/alley-dash`）、**坡地争营**（`/games/slope-camp`）、**灰棚交火**（`/games/ash-shed`）是原创单机闯关：分别是分路塔防、拉弓弹射拆楼、单球跳跃平台、镜头分段推进的定点射击、俯视短道赛车、排阵后观看简化比赛的战术小品、俯视小场地 3v3 动作足球、俯视街区接客送客、人机对阵的俯视小地图即时战略，以及俯视双摇杆枪战。各有 8 关（或 8 场），已解锁关卡可重选；胜负、重试、暂停（切到后台会自动暂停）和简短中文说明都在游戏页内。画面用 Canvas 矢量绘制，不依赖远程素材。这些目前没有多人模式。关卡进度见下方存档说明。

关于存档，请以实际实现为准：

- **跳一跳**：会把最高分写到本机 `localStorage` 键 `hop-original-best`。清站点数据或换浏览器就会丢失，**不跨设备同步**。
- **庭院防线**、**弹射工坊**、**滚球历险**、**街区突围**、**弯道冲刺**、**战术草稿**、**小场争锋**、**街巷快送**、**坡地争营**、**灰棚交火**：把已解锁关卡、各关最高星级和最高分写到本机 `localStorage` 键 `yard-defense-save`、`sling-workshop-save`、`roll-quest-save`、`street-rush-save`、`curve-sprint-save`、`tactic-sketch-save`、`pitch-clash-save`、`alley-dash-save`、`slope-camp-save`、`ash-shed-save`。存档损坏或存储不可用时会回退到默认进度，仍可继续玩，只是刷新后不一定保留。清站点数据或换浏览器就会丢失，**不跨设备同步**。
- **外观主题**（浅色 / 深色 / 跟随系统）：写在本机 `localStorage` 键 `mini-arcade-theme`，这是界面偏好，不是游戏进度。
- **其余 36 款游戏以及 TinyLang**：进度、分数、棋局都只留在当前页面内存里，刷新或离开即丢失。对战俄罗斯方块与联机五子棋的房间状态在 Worker 内存/DO 中只用于当次对局，不会保存分数。

本项目**没有**做成 PWA，**没有**离线安装包，**没有**账号系统，也**没有**跨设备云存档。

## 手机操作说明

本版本按手机浏览器竖屏游玩做了适配，目标宽度包括 320 / 375 / 390 / 430 px，同时保留桌面键盘与原规则。首页和游戏页会利用安全区，避免页面级横向溢出；过窄时按钮与表单文字按可点、可读来加大（输入框在窄屏上至少 16px，减轻 iOS 自动放大）。游戏页在「很矮的横屏」时会提示可以转回竖屏，双人乒乓也可继续用横屏，并不要求换到电脑。

通用操作原则：

- 依赖方向或按住的游戏会在画面下方给出触控按键。按键使用 pointer capture，并在 pointerup / pointercancel / lostpointercapture / 组件卸载时松开，避免卡键。需要连移的按键（如俄罗斯方块左右、推箱子方向）会在按住后自动连发。
- 需要滑动的游戏可在棋盘或画布上滑动（2048、贪吃蛇、迷宫豆豆等）。这些表面设置了 `touch-action: none`，避免误滚页面；页面本身在按钮和说明文字区域仍可正常上下滚动。
- 需要瞄准、拖动或按住蓄力的游戏（弹球、泡泡龙、跳一跳、打砖块、星际战机、接水果、乒乓、华容道等）把触点映射到画布或 SVG 的逻辑坐标。桌面键盘继续可用。
- 除 TinyLang 外，各游戏页可点「全屏游玩」：默认说明页不变，全屏只保留棋盘/画面与必要 HUD、退出和操作。方向类游戏使用共享半透明十字键（左十字、右圆形动作键，浮在画面上）；棋类、纸牌、点选/拖拽类保留天然触控，不为统一硬塞无用方向键，但棋盘会尽量铺满。Esc 或「退出全屏」可返回说明页。俄罗斯方块的已验收操作不变。
- 请用手机浏览器打开由 HTTP 服务器提供的页面（开发时为 `http://<主机>:5173/`，或预览 `http://<主机>:4173/`），不要用 `file://`。若访问的是尚未重新部署的旧站点，将看不到这次手机适配。

各游戏的触控方式见游戏页内说明。典型例子：俄罗斯方块按住左右连移、按住软降；贪吃蛇滑动或点方向键；2048 在棋盘上滑动；节奏游戏点 D/F/J/K 按钮或点按对应轨道，可同时按两轨；弹球按住左右拨杆和发射杆（手指略移出按钮也不会松开）；泡泡龙在场地上按住瞄准、松开发射；跳一跳按住蓄力、松开起跳；射击 / 坦克 / 丛林突击可同时按住方向与开火。

共享触控与布局逻辑放在 `src/mobile/`，配有纯函数单元测试。这些测试**不是**真机或浏览器实测。

## 测试范围（请勿理解为已全部深度试玩）

已覆盖的自动化检查：

- `npm run typecheck`：整个 TypeScript 项目的类型检查。
- `npm run build`：生产构建能否成功打包。
- `npm test`：从原规则中抽出的纯函数测试，包括二十一点点数与庄家 17 停牌、中国象棋蹩马腿 / 塞象眼 / 将帅照面、军棋吃子与排雷炸弹、四子棋重力与四连、泡泡龙三连消除与触底、飞行棋起飞 / 终点回退 / 撞回、对战方块的垃圾行数量 / 种子七袋 / 房间号格式 / 顶出判定、五子棋连五判定 / 和棋 / 非法落子；以及共享手机输入的坐标映射、滑动方向、按住会话（含松开与卸载清理）和窄屏行列缩放是否横向溢出。

未覆盖、需要在浏览器或真机里人工确认的部分包括但不限于：

- 各游戏在真实手机与桌面的手感、多指同时按键、滚动与误触
- 画布类游戏（弹珠台、飞行棋棋盘对齐、泡泡龙瞄准轨迹、街机射击等）的碰撞、帧循环和触点是否对准
- 人机对战的体验与强度
- 深色 / 浅色主题在每一款游戏里的对比度
- 路由前进后退、刷新深链、旋转屏幕、全面屏安全区与系统手势条
- 跳一跳最高分在刷新后是否仍能读出

不要把「构建和规则测试通过」理解成「47 款都已经在手机上深度试玩通过」。联机房间尤其需要两台设备或两个浏览器窗口，用 `wrangler dev` 在本地验证。

## 目录说明

- `src/games/`：迁移后的游戏页面（已改为从 `../compat/grok-canvas` 引入本地兼容组件）
- `src/compat/`：不依赖 Grok 平台或网络 API 的 UI / 主题层
- `src/pages/`：首页、壳层导航、游戏路由
- `src/mobile/`：共享触控按键、滑动、坐标映射与窄屏缩放
- `src/rules/`：供单元测试使用的纯规则模块（含对战方块与联机五子棋规则、房间协议类型）
- `worker/`：Cloudflare Worker 入口与对战房间 Durable Object（`TetrisVsRoom`、`GomokuVsRoom`）
- `archive/canvases/`：原版 Canvas 源码归档，请勿当成运行入口

原版 Canvas 页面本身没有在这次迁移中修改。
