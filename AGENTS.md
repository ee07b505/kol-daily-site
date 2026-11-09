# AGENTS.md — kol-daily-site

## 1. Project Overview & Architecture

纯静态 GitHub Pages 站：归档加密 KOL 日报、代币机会 CSV、KOL 名单。无 npm 依赖、无 CDN；构建产物全在 `dist/`，可本地打开或部署到 `gh-pages`。

| 路径 | 职责 |
|------|------|
| `build.mjs` | 扫描 `/workspace/kol-daily` 与 KOL CSV，生成 HTML，拷贝静态资源到 `dist/` |
| `site.css` | 暗色主题、布局、价带与表格样式 |
| `tables.js` | 机会 / KOL 页本地筛选、排序（数据内嵌，不 fetch） |
| `prices.js` | 浏览器直连 Binance 现货与 CoinGecko 公开行情，渲染价带（仅允许这两种 fetch） |
| `deploy.sh` | `npm run build` → commit `main` → `git subtree push` `dist` 到 `gh-pages` |
| `dist/` | 发布根目录（含 `assets/`、`reports/`、`.nojekyll`） |

数据流：源 HTML/CSV → `build.mjs` → `dist/*.html` + `dist/assets/*` → GitHub Pages。

## 2. Build, Lint & Test Commands

```sh
cd /workspace/kol-daily-site
npm run build          # node build.mjs；需 Node >= 20
./deploy.sh            # 仅在 main 分支；构建并推送 main + gh-pages
```

无 linter / 测试套件。改完后必须本地 `npm run build`，确认：

- `dist/assets/prices.js`、`dist/assets/site.css`、`dist/assets/tables.js` 存在
- `dist/index.html` / `chance.html` / `kols.html` / `reports/*.html` 含价带容器与 `prices.js` 引用

输入路径（只读，勿改）：

- `/workspace/kol-daily/kol-daily-YYYY-MM-DD.html`
- `/workspace/kol-daily/chance-YYYY-MM-DD.csv`
- `/workspace/crypto-kol-x-accounts.csv`

## 3. Code Style & Engineering Standards

- Vanilla JS / 原生 CSS / Node ESM；禁止引入 npm 包或外部 CDN 脚本。
- 显式错误处理：行情请求失败时保留上次数据并展示「行情暂时不可用」，勿静默吞掉。
- 构建脚本保持最小改动；勿改日报正文 / CSV 解析逻辑，除非为挂载脚本所必需。
- HTML 转义用现有 `esc()`；用户可见时间为 Asia/Shanghai（北京时间）。

## 4. Domain & Business Invariants

- 价带 12 币：Binance USDT 现货 `BTC ETH SOL BNB XRP DOGE HYPE NEAR ZEC`；无现货对的 `哈基米`（CoinGecko `hakimi`，BSC `0x82Ec31D69b3c289E541b50E30681FD1ACAd24444`）、`PONS`（`pons`，Robinhood Chain `0x39dBED3a2bd333467115dE45665cC57F813C4571`）、`STONKS`（`stonks-9`，BSC `0xc9d825E83AadA475bD4d38C8ca984eD746277777`）每次从 CoinGecko 补价。
- 轮询间隔 30 秒；有现货对的走 Binance USDT，无现货对的走 CoinGecko；Binance 连续失败后整条价带回退 CoinGecko USD；页面 `document.hidden` 时暂停轮询；UI 标明当前来源。
- 筛选 / 表格数据仍内嵌页面，不依赖 fetch；实时价是刻意例外。
- 不伪造价格、不提供离线假数据冒充实时行情。

## 5. Security Redlines

- **仅允许**浏览器 `fetch`：`https://data-api.binance.vision`（`/api/v3/ticker/24hr`）为主源；连续失败后允许回退 `https://api.coingecko.com`（`/api/v3/simple/price`，免 key）。
- 禁止硬编码 API key / 密钥 / 私钥；本站行情接口无需 key。
- 禁止野生 CORS 代理、其它未列入的行情 CDN / 代理。
- 禁止在日志或页面中打印凭据；`deploy.sh` / git 凭据不写入仓库。

## 6. Multi-Agent Role Boundaries

- 当前阶段：价带功能（`prices.js` + 构建注入 + 样式 + 文档 + 部署）。
- 文件锁：同一次改动内由单一执行者修改 `build.mjs` / `site.css` / `prices.js` / `deploy.sh` / `README.md` / `AGENTS.md`，避免并行冲突。
- 日报内容生成在 `/workspace/kol-daily`，本仓库只消费构建结果。
