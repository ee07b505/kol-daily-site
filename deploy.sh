#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Run deployment from the main branch.' >&2
  exit 1
fi
npm run build
git add -- build.mjs package.json site.css tables.js prices.js README.md AGENTS.md CLAUDE.md deploy.sh dist/
if ! git diff --cached --quiet; then
  git commit -m "Update daily KOL site"
fi
git push -u origin main
git subtree push --prefix dist origin gh-pages
echo 'Published: https://ee07b505.github.io/kol-daily-site/'
