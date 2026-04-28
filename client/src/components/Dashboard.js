import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Weather from './Weather';
import './Dashboard.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

const MAX_POINTS = 40;
const WS_URL = 'ws://localhost:5000';

const COINS = {
  bitcoin:  { label: 'Bitcoin (BTC)',  color: '#f97316', bg: 'rgba(249,115,22,0.08)',  symbol: 'BTC' },
  ethereum: { label: 'Ethereum (ETH)', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  symbol: 'ETH' },
  litecoin: { label: 'Litecoin (LTC)', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', symbol: 'LTC' },
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    tooltip: {
      callbacks: {
        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', maxTicksLimit: 8, maxRotation: 0 },
      grid:  { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: {
        color: '#64748b',
        callback: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
  },
};

function fmt(val) {
  if (val == null) return '—';
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard({ onLogout }) {
  const [labels, setLabels]     = useState([]);
  const [series, setSeries]     = useState({ bitcoin: [], ethereum: [], litecoin: [] });
  const [basePrice, setBase]    = useState({});
  const [latest, setLatest]     = useState({ bitcoin: null, ethereum: null, litecoin: null, btc_change: null, eth_change: null, ltc_change: null });
  const [visible, setVisible]   = useState({ bitcoin: true, ethereum: true, litecoin: true });
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('Connecting…');
  const wsRef = useRef(null);
  const baseRef = useRef({});

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setStatus('Live');

    ws.onmessage = evt => {
      const d = JSON.parse(evt.data);
      if (!d.bitcoin) return;

      // Record first price as baseline for % change chart
      if (!baseRef.current.bitcoin && d.bitcoin) {
        baseRef.current = { bitcoin: d.bitcoin, ethereum: d.ethereum, litecoin: d.litecoin };
        setBase(baseRef.current);
      }

      setLatest(d);
      setLabels(prev => [...prev, d.timestamp].slice(-MAX_POINTS));
      setSeries(prev => ({
        bitcoin:  [...prev.bitcoin,  pct(d.bitcoin,  baseRef.current.bitcoin)].slice(-MAX_POINTS),
        ethereum: [...prev.ethereum, pct(d.ethereum, baseRef.current.ethereum)].slice(-MAX_POINTS),
        litecoin: [...prev.litecoin, pct(d.litecoin, baseRef.current.litecoin)].slice(-MAX_POINTS),
      }));
    };

    ws.onerror = () => setStatus('Error');
    ws.onclose = () => { setStatus('Reconnecting…'); setTimeout(connect, 3000); };
  }, []);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  const pct = (cur, base) => base ? +((( cur - base) / base) * 100).toFixed(3) : 0;

  const filteredCoins = Object.keys(COINS).filter(k =>
    COINS[k].label.toLowerCase().includes(search.toLowerCase())
  );

  const chartData = {
    labels,
    datasets: filteredCoins
      .filter(k => visible[k])
      .map(k => ({
        label:           COINS[k].label,
        data:            series[k],
        borderColor:     COINS[k].color,
        backgroundColor: COINS[k].bg,
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.4,
      })),
  };

  const changeKey = { bitcoin: 'btc_change', ethereum: 'eth_change', litecoin: 'ltc_change' };

  return (
    <div className="dash-layout">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-icon">📊</span>
          <span className="dash-title">Real-Time Dashboard</span>
        </div>
        <div className="dash-header-right">
          <span className={`status-badge ${status === 'Live' ? 'live' : 'offline'}`}>
            <span className="status-dot" /> {status}
          </span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="dash-main">

        {/* ── Real weather ── */}
        <Weather />

        {/* ── Crypto price cards ── */}
        <div className="stat-cards">
          {Object.entries(COINS).map(([key, meta]) => {
            const change = latest[changeKey[key]];
            const isUp   = change > 0;
            return (
              <div
                key={key}
                className={`stat-card ${visible[key] ? 'active' : 'muted'}`}
                onClick={() => setVisible(v => ({ ...v, [key]: !v[key] }))}
                style={{ '--accent': meta.color }}
              >
                <p className="stat-label">{meta.label}</p>
                <p className="stat-value">{fmt(latest[key])}</p>
                <p className={`stat-change ${isUp ? 'up' : change < 0 ? 'down' : ''}`}>
                  {change != null ? `${isUp ? '▲' : '▼'} ${Math.abs(change)}% (24h)` : '—'}
                </p>
                <p className="stat-toggle">{visible[key] ? 'Visible' : 'Hidden'}</p>
              </div>
            );
          })}
        </div>

        {/* ── Live chart ── */}
        <div className="chart-panel">
          <div className="chart-toolbar">
            <div>
              <h2 className="chart-heading">Price Change (% from session start)</h2>
              <p className="chart-subheading">Live via CoinGecko · updates every 15 s · no API key</p>
            </div>
            <input
              className="metric-search"
              type="search"
              placeholder="Filter coins…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chart-container">
            {chartData.datasets.length === 0 ? (
              <p className="chart-empty">No coins match your filter.</p>
            ) : labels.length < 2 ? (
              <p className="chart-empty">Waiting for data…</p>
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
