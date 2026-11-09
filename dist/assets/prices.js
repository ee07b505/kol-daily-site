'use strict';
(() => {
  const SYMBOLS = [
    { base: 'BTC', pair: 'BTCUSDT', gecko: 'bitcoin' },
    { base: 'ETH', pair: 'ETHUSDT', gecko: 'ethereum' },
    { base: 'SOL', pair: 'SOLUSDT', gecko: 'solana' },
    { base: 'BNB', pair: 'BNBUSDT', gecko: 'binancecoin' },
    { base: 'XRP', pair: 'XRPUSDT', gecko: 'ripple' },
    { base: 'DOGE', pair: 'DOGEUSDT', gecko: 'dogecoin' },
    { base: 'HYPE', pair: 'HYPEUSDT', gecko: 'hyperliquid' },
    { base: 'NEAR', pair: 'NEARUSDT', gecko: 'near' },
    { base: 'ZEC', pair: 'ZECUSDT', gecko: 'zcash' },
    { base: '哈基米', gecko: 'hakimi' },
    { base: 'PONS', gecko: 'pons' },
    { base: 'STONKS', gecko: 'stonks-4' },
  ];
  const SPOT_SYMBOLS = SYMBOLS.filter((s) => s.pair);
  const EXTRA_SYMBOLS = SYMBOLS.filter((s) => !s.pair);
  const BINANCE_URL =
    'https://data-api.binance.vision/api/v3/ticker/24hr?symbols=' +
    encodeURIComponent(JSON.stringify(SPOT_SYMBOLS.map((s) => s.pair)));
  function geckoUrl(list) {
    return (
      'https://api.coingecko.com/api/v3/simple/price?ids=' +
      list.map((s) => s.gecko).join(',') +
      '&vs_currencies=usd&include_24hr_change=true'
    );
  }
  const GECKO_URL = geckoUrl(SYMBOLS);
  const GECKO_EXTRA_URL = geckoUrl(EXTRA_SYMBOLS);
  const POLL_MS = 30_000;
  const FAIL_BEFORE_FALLBACK = 2;

  const root = document.getElementById('price-ticker');
  if (!root) return;
  const track = document.getElementById('price-ticker-track');
  const updatedEl = document.getElementById('price-ticker-updated');
  const statusEl = document.getElementById('price-ticker-status');
  const sourceEl = document.getElementById('price-ticker-source');

  let lastOk = null;
  let lastSource = null;
  let binanceFails = 0;
  let timer = null;

  function formatPrice(n) {
    if (!Number.isFinite(n)) return '—';
    if (n >= 1000) {
      return n.toLocaleString('en-US', {
        minimumFractionDigits: n >= 10000 ? 0 : 2,
        maximumFractionDigits: 2,
      });
    }
    if (n >= 1) {
      return n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    }
    if (n >= 0.01) {
      return n.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      });
    }
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }

  function formatPct(n) {
    if (!Number.isFinite(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return sign + n.toFixed(2) + '%';
  }

  function beijingNow() {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  }

  function setStatus(msg, isError) {
    if (!statusEl) return;
    if (!msg) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      statusEl.classList.remove('is-error');
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', !!isError);
  }

  function setSource(label) {
    if (sourceEl) sourceEl.textContent = label;
  }

  function chipHtml(base, row) {
    if (!row) {
      return `<span class="price-item" role="listitem"><span class="price-sym">${base}</span><span class="price-val">—</span><span class="price-chg flat">—</span></span>`;
    }
    const dir = row.pct > 0 ? 'up' : row.pct < 0 ? 'down' : 'flat';
    return `<span class="price-item" role="listitem"><span class="price-sym">${base}</span><span class="price-val">$${formatPrice(row.price)}</span><span class="price-chg ${dir}">${formatPct(row.pct)}</span></span>`;
  }

  function paintTrack(map) {
    if (!track) return;
    const chips = SYMBOLS.map(({ base }) => chipHtml(base, map ? map.get(base) : null)).join('<span class="price-sep" aria-hidden="true">·</span>');
    // Duplicate for seamless marquee; aria-hidden on clone.
    track.innerHTML =
      `<div class="price-ticker-group">${chips}</div>` +
      `<div class="price-ticker-group" aria-hidden="true">${chips}</div>`;
  }

  function render(map, sourceLabel) {
    paintTrack(map);
    if (sourceLabel) {
      lastSource = sourceLabel;
      setSource(sourceLabel);
    }
    if (updatedEl) {
      updatedEl.textContent = `北京时间 ${beijingNow()}`;
      updatedEl.dataset.hadUpdate = '1';
    }
  }

  function placeholders() {
    if (!track || track.querySelector('.price-item')) return;
    paintTrack(null);
  }

  function parseGecko(data, list) {
    const map = new Map();
    for (const { base, gecko } of list) {
      const row = data[gecko];
      if (!row || row.usd == null) continue;
      map.set(base, {
        price: Number(row.usd),
        pct: Number(row.usd_24h_change),
      });
    }
    return map;
  }

  async function fetchBinance() {
    const res = await fetch(BINANCE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('bad payload');
    const byPair = new Map(data.map((row) => [row.symbol, row]));
    const map = new Map();
    for (const { base, pair } of SPOT_SYMBOLS) {
      const row = byPair.get(pair);
      if (!row) continue;
      map.set(base, {
        price: Number(row.lastPrice),
        pct: Number(row.priceChangePercent),
      });
    }
    if (!map.size) throw new Error('empty');
    return map;
  }

  async function fetchGecko(url, list) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || typeof data !== 'object') throw new Error('bad payload');
    const map = parseGecko(data, list);
    if (!map.size) throw new Error('empty');
    return map;
  }

  async function mergeExtras(map) {
    if (!EXTRA_SYMBOLS.length) return { map, extrasOk: true };
    try {
      const extras = await fetchGecko(GECKO_EXTRA_URL, EXTRA_SYMBOLS);
      for (const [base, row] of extras) map.set(base, row);
      return { map, extrasOk: true };
    } catch (_) {
      return { map, extrasOk: false };
    }
  }

  async function refresh() {
    if (document.hidden) return;
    try {
      let map = await fetchBinance();
      binanceFails = 0;
      const merged = await mergeExtras(map);
      map = merged.map;
      lastOk = map;
      render(
        map,
        merged.extrasOk
          ? 'Binance 公开行情（USDT）；哈基米 / PONS / STONKS 为 CoinGecko'
          : 'Binance 公开行情（USDT）'
      );
      setStatus(merged.extrasOk ? '' : '部分代币行情暂时不可用', !merged.extrasOk);
      return;
    } catch (_) {
      binanceFails += 1;
    }

    if (binanceFails >= FAIL_BEFORE_FALLBACK) {
      try {
        const map = await fetchGecko(GECKO_URL, SYMBOLS);
        lastOk = map;
        render(map, 'CoinGecko（USD，回退）');
        setStatus('');
        return;
      } catch (_) {
        /* both failed */
      }
    }

    if (lastOk) {
      render(lastOk, lastSource);
      setStatus('行情暂时不可用（保留上次数据）', true);
    } else {
      placeholders();
      setStatus('行情暂时不可用', true);
      if (updatedEl && !updatedEl.dataset.hadUpdate) {
        updatedEl.textContent = '等待行情…';
      }
    }
  }

  function startPolling() {
    if (timer != null) return;
    timer = setInterval(refresh, POLL_MS);
  }

  function stopPolling() {
    if (timer == null) return;
    clearInterval(timer);
    timer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPolling();
    } else {
      refresh();
      startPolling();
    }
  });

  placeholders();
  setSource('行情加载中…');
  refresh();
  if (!document.hidden) startPolling();
})();
