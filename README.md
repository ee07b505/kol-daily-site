# 加密 KOL 日报归档

纯静态、中文暗色网站，无依赖、无 CDN；所有页面与脚本在 `dist/`，可直接打开 `dist/index.html`。筛选数据内嵌页面，不依赖 fetch 或服务器。首页等页面浏览器端直连 Binance 公开行情展示主流币实时价，仍无 npm 依赖。X 链接仅在点击后访问外部网站。

## 构建

需要 Node.js 20（20.11 或更新版本）。无需安装 npm 包：

```sh
cd /workspace/kol-site
npm run build
```

构建只读取以下输入，不修改源文件：

- `/workspace/kol-daily/kol-daily-YYYY-MM-DD.html`
- `/workspace/kol-daily/chance-YYYY-MM-DD.csv`
- `/workspace/crypto-kol-x-accounts.csv`

每次构建会清空并重新生成本项目的 `dist/`。日报按文件日期倒序排列，首页从摘要列表中提取最多三行；无法提取时提供完整日报链接。日报保留原始内容，插入共享导航。机会页面收录所有 CSV 日期；默认显示最新日期。KOL 页面支持搜索、分类、语言筛选；所有数据列可排序，数值列按数值排序，空值排在末尾。

每天新输入文件到齐后（通常北京时间 08:42 左右）重新执行构建即可更新。建议在源文件写入完毕后执行；本项目不配置自动调度或发布。

## GitHub Pages 部署

构建后仅发布 `dist/` 的内容：

1. 在 GitHub 创建仓库，将 `dist/` 内文件作为发布分支（例如 `gh-pages`）的根目录内容，保留 `assets/`、`reports/` 和 `.nojekyll`。
2. 仓库 Settings → Pages → Build and deployment，选择 Deploy from a branch，选择发布分支及 `/ (root)`。
3. 保存后访问 GitHub 提供的 Pages 地址。相对链接兼容项目路径，例如 `https://用户名.github.io/仓库名/`。

也可以自行配置 GitHub Actions：在已准备好上述输入文件的运行环境执行 `npm run build`，使用 Pages artifact 上传整个 `dist/`，再部署该 artifact。原始绝对路径是构建机器路径，Pages 只需生成结果。

公开站点：https://ee07b505.github.io/kol-daily-site/

每天输入文件更新后，在本机运行 `./deploy.sh`。脚本执行构建，将源文件和 `dist/` 的更新提交并推送到 `main`，再将 `dist/` 发布到 `gh-pages` 根目录。需要已认证的 GitHub Git 凭据、Node.js，以及上述输入文件；Pages 会在推送后自动更新。

## 文件

- `build.mjs`：扫描输入、解析 CSV、生成页面与静态资源。
- `site.css`：布局、主题与移动端样式。
- `tables.js`：本地搜索、过滤、日期切换与排序。
- `prices.js`：浏览器直连 Binance 公开行情，渲染主流币实时价带。
- `dist/index.html`、`dist/chance.html`、`dist/kols.html`、`dist/reports/<日期>.html`。
