# AGENTS.md — kol-daily-site

## 1. Project Overview & Architecture

纯静态 GitHub Pages 站：归档加密 KOL 日报、代币机会 CSV、KOL 名单。无 npm 依赖、无 CDN；构建产物全在 `dist/`，可本地打开或部署到 `gh-pages`。

| 路径 | 职责 |
|------|------|
| `build.mjs` | 扫描 `/workspace/kol-daily` 与 KOL CSV，生成 HTML，拷贝静态资源到 `dist/` |
| `site.css` | 暗色主题、布局、价带与表格样式 |
| `tables.js` | 机会 / KOL 页本地筛选、排序（数据内嵌，不 fetch） |
| `prices.js` | 浏览器直连 Binance 公开行情，渲染主流币价带（唯一允许的 fetch） |
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

- 价带固定 9 币：`BTC ETH SOL BNB XRP DOGE HYPE NEAR ZEC`（交易对 `*USDT`）。
- 轮询间隔 30 秒；主源 Binance USDT，连续失败后回退 CoinGecko USD；页面 `document.hidden` 时暂停轮询；UI 标明当前来源。
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
