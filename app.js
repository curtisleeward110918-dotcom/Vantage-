const tabs = document.querySelectorAll('.nav-tab');
const panels = document.querySelectorAll('.tab-panel');
const pageTitle = document.getElementById('pageTitle');
const journalForm = document.getElementById('journalForm');
const feedback = document.getElementById('journalFeedback');

const starterTrades = [
  { date: '2026-04-12', time: '09:10', pair: 'XAUUSD', dir: 'Buy', entry: 2348.2, stopLoss: 2342.2, takeProfit: 2360.0, exit: 2359.8, rr: 1.9, pl: 380, session: 'London', setup: 'Retest', status: 'Closed Win', lotSize: 0.5, riskAmount: 200, resultPercent: 1.9 },
  { date: '2026-04-11', time: '13:35', pair: 'XAUUSD', dir: 'Sell', entry: 2361.4, stopLoss: 2366.9, takeProfit: 2351.0, exit: 2352.6, rr: 1.6, pl: 240, session: 'New York', setup: 'Reversal', status: 'Closed Win', lotSize: 0.5, riskAmount: 150, resultPercent: 1.6 },
  { date: '2026-04-10', time: '08:40', pair: 'XAUUSD', dir: 'Buy', entry: 2339.7, stopLoss: 2334.1, takeProfit: 2351.0, exit: 2334.1, rr: -1.0, pl: -150, session: 'London', setup: 'Breakout', status: 'Closed Loss', lotSize: 0.5, riskAmount: 150, resultPercent: -1.0 },
  { date: '2026-04-09', time: '03:20', pair: 'XAUUSD', dir: 'Buy', entry: 2328.4, stopLoss: 2322.5, takeProfit: 2340.2, exit: 2340.2, rr: 2.0, pl: 410, session: 'Asia', setup: 'Sweep', status: 'Closed Win', lotSize: 0.5, riskAmount: 200, resultPercent: 2.0 }
];

let trades = loadTrades();
let equityData = [];
let drawdownData = [];
let sessionData = [];
let setupData = [];
let marketPrices = [2328, 2334, 2331, 2340, 2348, 2342, 2351, 2359, 2354, 2362, 2368, 2361];
let monthlyPerformance = [];

/* ===============================
   LOCAL STORAGE
================================= */

function loadTrades() {
  try {
    const saved = localStorage.getItem('edgeJournalTrades');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (error) {
    console.error('Failed to load saved trades', error);
  }
  return starterTrades.slice();
}

function saveTrades() {
  localStorage.setItem('edgeJournalTrades', JSON.stringify(trades));
}

/* ===============================
   FORMATTING + HELPERS
================================= */

function formatCurrency(value) {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatRR(value) {
  const rounded = Number(value || 0).toFixed(2).replace(/\.00$/, '');
  return `${rounded}R`;
}

function sortTradesDesc(items) {
  return items.slice().sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`));
}

function getClosedTrades() {
  return trades.filter(t => t.status !== 'Open');
}

function parseNumber(value) {
  return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
}

function parseRRValue(value) {
  const raw = String(value || '').trim();
  if (raw.includes(':')) {
    const parts = raw.split(':').map(part => parseNumber(part));
    if (parts.length === 2 && parts[0] !== 0) {
      return parts[1] / parts[0];
    }
  }
  return parseNumber(raw);
}

function deriveStatus(pl, selectedStatus) {
  if (selectedStatus === 'Open') return 'Open';
  return pl >= 0 ? 'Closed Win' : 'Closed Loss';
}

/* ===============================
   ANALYTICS
================================= */

function calculateDerivedData() {
  const closedTrades = getClosedTrades();
  const sortedAsc = closedTrades.slice().sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

  let equity = 10000;
  let peak = equity;
  equityData = [];
  drawdownData = [];

  sortedAsc.forEach(trade => {
    equity += Number(trade.pl || 0);
    peak = Math.max(peak, equity);
    const dd = peak === 0 ? 0 : ((equity - peak) / peak) * 100;
    equityData.push(Number(equity.toFixed(2)));
    drawdownData.push(Number(dd.toFixed(2)));
  });

  const sessionTotals = {};
  const setupTotals = {};
  closedTrades.forEach(trade => {
    sessionTotals[trade.session] = (sessionTotals[trade.session] || 0) + Number(trade.pl || 0);
    setupTotals[trade.setup] = (setupTotals[trade.setup] || 0) + Number(trade.pl || 0);
  });

  const maxSession = Math.max(1, ...Object.values(sessionTotals).map(v => Math.abs(v)));
  sessionData = Object.keys(sessionTotals).map(label => ({
    label,
    value: Math.max(8, Math.round((Math.abs(sessionTotals[label]) / maxSession) * 100)),
    raw: sessionTotals[label]
  }));

  const maxSetup = Math.max(1, ...Object.values(setupTotals).map(v => Math.abs(v)));
  setupData = Object.keys(setupTotals).map(label => ({
    label,
    value: Math.max(8, Math.round((Math.abs(setupTotals[label]) / maxSetup) * 100)),
    raw: setupTotals[label]
  }));

  const monthlyTotals = {};
  closedTrades.forEach(trade => {
    const month = trade.date.slice(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(trade.pl || 0);
  });

  const orderedMonths = Object.keys(monthlyTotals).sort();
  monthlyPerformance = orderedMonths.map(month => ({
    label: month.slice(5),
    value: Number(monthlyTotals[month].toFixed(2)),
    month
  }));

  if (sortedAsc.length) {
    marketPrices = sortedAsc.map(t => Number(t.exit || t.entry || 0)).filter(Boolean);
  }
}

function populateTables() {
  const recentBody = document.getElementById('recentTradesTable');
  const journalBody = document.getElementById('journalTable');
  if (!recentBody || !journalBody) return;

  const sorted = sortTradesDesc(trades);

  recentBody.innerHTML = sorted.slice(0, 8).map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.pair}</td>
      <td>${t.dir}</td>
      <td>${Number(t.entry).toFixed(1)}</td>
      <td>${Number(t.exit).toFixed(1)}</td>
      <td>${formatRR(Number(t.rr || 0))}</td>
      <td>${formatCurrency(Number(t.pl || 0))}</td>
    </tr>
  `).join('');

  journalBody.innerHTML = sorted.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.session}</td>
      <td>${t.setup}</td>
      <td>${String(t.status || '').replace('Closed ', '')}</td>
      <td>${formatRR(Number(t.rr || 0))}</td>
      <td>${formatCurrency(Number(t.pl || 0))}</td>
    </tr>
  `).join('');
}

function populateSessionBars() {
  const wrap = document.getElementById('sessionBars');
  if (!wrap) return;
  wrap.innerHTML = sessionData.map(item => `
    <div class="bar-row">
      <span>${item.label} · ${formatCurrency(item.raw || 0)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${item.value}%"></div></div>
    </div>
  `).join('');
}

function updateMetrics() {
  const closed = getClosedTrades();
  const wins = closed.filter(t => Number(t.pl) > 0);
  const losses = closed.filter(t => Number(t.pl) < 0);
  const totalTrades = closed.length;
  const netPL = closed.reduce((sum, t) => sum + Number(t.pl || 0), 0);
  const avgRR = totalTrades ? closed.reduce((sum, t) => sum + Number(t.rr || 0), 0) / totalTrades : 0;
  const grossProfit = wins.reduce((sum, t) => sum + Number(t.pl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Number(t.pl || 0), 0));
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const expectancy = totalTrades ? closed.reduce((sum, t) => sum + Number(t.rr || 0), 0) / totalTrades : 0;
  const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((sum, t) => sum + Number(t.pl || 0), 0) / losses.length : 0;
  const maxDrawdown = drawdownData.length ? Math.min(...drawdownData) : 0;

  let streak = 0;
  let bestStreak = 0;
  getClosedTrades().slice().sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`)).forEach(trade => {
    if (Number(trade.pl) > 0) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  });

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('heroWinRate', `${winRate.toFixed(0)}%`);
  setText('heroProfitFactor', profitFactor ? profitFactor.toFixed(2) : '0.00');
  setText('heroExpectancy', `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`);
  setText('totalTrades', String(totalTrades));
  setText('netPL', formatCurrency(netPL));
  setText('maxDrawdown', `${maxDrawdown.toFixed(1)}%`);
  setText('avgRR', `${avgRR >= 0 ? '' : '-'}${Math.abs(avgRR).toFixed(2)}R`);

  setText('homeTotalTrades', String(totalTrades));
  setText('homeWinRate', `${winRate.toFixed(0)}%`);
  setText('homeProfitFactor', profitFactor ? profitFactor.toFixed(2) : '0.00');
  setText('homeExpectancy', `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`);

  setText('analyticsWinLoss', `${wins.length} / ${losses.length}`);
  setText('bestTrade', wins.length ? formatCurrency(Math.max(...wins.map(t => Number(t.pl)))) : '$0');
  setText('worstTrade', losses.length ? formatCurrency(Math.min(...losses.map(t => Number(t.pl)))) : '$0');
  setText('longestStreak', `${bestStreak} Wins`);
  setText('expectancyMetric', `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`);
  setText('avgWinMetric', formatCurrency(avgWin));
  setText('avgLossMetric', formatCurrency(avgLoss));
  setText('profitFactorMetric', profitFactor ? profitFactor.toFixed(2) : '0.00');
}

/* ===============================
   CHARTS
================================= */

function setupCanvas(canvasId, height = 320) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(canvas.clientWidth, 300);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { canvas, ctx, width, height };
}

function drawGrid(ctx, width, height, pad) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const y = pad + ((height - pad * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const x = pad + ((width - pad * 2) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, height - pad);
    ctx.stroke();
  }
}

function drawLineChart(canvasId, data, options = {}) {
  const setup = setupCanvas(canvasId, options.height || 320);
  if (!setup || !data.length) return;

  const { ctx, width, height } = setup;
  const pad = 26;
  drawGrid(ctx, width, height, pad);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1);

  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = options.color || '#d9b56d';

  data.forEach((value, index) => {
    const x = pad + index * stepX;
    const y = pad + (1 - ((value - min) / range)) * (height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  data.forEach((value, index) => {
    const x = pad + index * stepX;
    const y = pad + (1 - ((value - min) / range)) * (height - pad * 2);
    ctx.beginPath();
    ctx.fillStyle = options.point || '#f0cc84';
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function roundRect(ctx, x, y, width, height, radius, fill) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
}

function drawBarChart(canvasId, items, options = {}) {
  const setup = setupCanvas(canvasId, options.height || 320);
  if (!setup || !items.length) return;

  const { ctx, width, height } = setup;
  const pad = 24;
  drawGrid(ctx, width, height, pad);

  const max = Math.max(...items.map(i => Math.abs(i.value)), 1);
  const barWidth = (width - pad * 2) / items.length * 0.58;

  items.forEach((item, index) => {
    const xStep = (width - pad * 2) / items.length;
    const x = pad + index * xStep + (xStep - barWidth) / 2;
    const barHeight = (Math.abs(item.value) / max) * (height - pad * 2 - 24);
    const y = height - pad - barHeight;

    ctx.fillStyle = item.value >= 0 ? (options.color || '#d9b56d') : (options.negativeColor || '#8eb7ff');
    roundRect(ctx, x, y, barWidth, barHeight, 10, true);

    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '12px Arial';
    ctx.fillText(item.label, x, height - 8);
  });
}

function drawMonthlyBars(canvasId, items) {
  const series = items.length
    ? items.map(item => ({ label: item.label, value: item.value }))
    : [{ label: 'M1', value: 0 }];
  drawBarChart(canvasId, series, { color: '#f0cc84', negativeColor: '#8eb7ff', height: 320 });
}

function updateChartStats() {
  const bias = marketPrices.length && marketPrices[marketPrices.length - 1] >= marketPrices[0] ? 'Bullish' : 'Bearish';
  const range = marketPrices.length ? (Math.max(...marketPrices) - Math.min(...marketPrices)).toFixed(1) : '0.0';
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('currentBias', bias);
  setText('currentRange', range);
  setText('currentMomentum', bias === 'Bullish' ? 'Positive follow-through' : 'Weakening move');
}

function drawAllCharts() {
  drawLineChart('equityChart', equityData.length ? equityData : [10000], { color: '#d9b56d', point: '#f0cc84', height: 380 });
  drawBarChart('sessionChart', sessionData.length ? sessionData : [{ label: 'London', value: 0 }], { color: '#d9b56d', negativeColor: '#8eb7ff', height: 320 });
  drawLineChart('drawdownChart', drawdownData.length ? drawdownData : [0], { color: '#8eb7ff', point: '#8eb7ff', height: 320 });
  drawBarChart('setupChart', setupData.length ? setupData : [{ label: 'Retest', value: 0 }], { color: '#f0cc84', negativeColor: '#8eb7ff', height: 320 });
  drawLineChart('marketChart', marketPrices.length ? marketPrices : [0], { color: '#d9b56d', point: '#f0cc84', height: 380 });
  drawMonthlyBars('monthlyChart', monthlyPerformance);
  updateChartStats();
}

function renderDashboard() {
  calculateDerivedData();
  populateTables();
  populateSessionBars();
  updateMetrics();
  drawAllCharts();
}

/* ===============================
   NAVIGATION
================================= */

function switchTab(target) {
  tabs.forEach(b => b.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));

  const activeTab = document.querySelector(`.nav-tab[data-tab="${target}"]`);
  const targetPanel = document.getElementById(target);

  if (activeTab) activeTab.classList.add('active');
  if (targetPanel) targetPanel.classList.add('active');
  if (pageTitle && activeTab) pageTitle.textContent = activeTab.textContent;

  requestAnimationFrame(drawAllCharts);
}

/* ===============================
   SUPABASE AUTH + CLOUD SAVE
================================= */

const SUPABASE_URL = 'https://wvptlyyxygoyipwbtzmp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cHRseXl4eWdveWlwd2J0em1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTM2NjksImV4cCI6MjA5MTUyOTY2OX0.uuUUrmvR5lEXvuemHkE7ERr0Ef7vULBmkgKeJxJfI18';

const sbClient = typeof supabase !== 'undefined'
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

function setAuthFeedback(message, isError = false) {
  const el = document.getElementById('authFeedback');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#ffd3d3' : '';
}

async function getCurrentUser() {
  if (!sbClient) return null;
  const { data, error } = await sbClient.auth.getUser();
  if (error) {
    console.error('getUser failed', error);
    return null;
  }
  return data?.user || null;
}

function mapTradeToDb(trade, userId) {
  return {
    user_id: userId,
    trade_date: trade.date,
    trade_time: trade.time || null,
    pair: trade.pair || null,
    direction: trade.dir || null,
    entry_price: trade.entry ?? null,
    stop_loss: trade.stopLoss ?? null,
    take_profit: trade.takeProfit ?? null,
    exit_price: trade.exit ?? null,
    lot_size: trade.lotSize ?? null,
    risk_amount: trade.riskAmount ?? null,
    rr: trade.rr ?? null,
    profit_loss: trade.pl ?? null,
    result_percent: trade.resultPercent ?? null,
    session: trade.session || null,
    setup_type: trade.setup || null,
    status: trade.status || null,
    confluences: trade.confluences || null,
    reason_for_entry: trade.reasonForEntry || null,
    mistakes: trade.mistakes || null,
    psychology_notes: trade.psychologyNotes || null
  };
}

function mapDbToTrade(row) {
  return {
    id: row.id,
    date: row.trade_date,
    time: row.trade_time || '',
    pair: row.pair || 'XAUUSD',
    dir: row.direction || 'Buy',
    entry: Number(row.entry_price || 0),
    stopLoss: Number(row.stop_loss || 0),
    takeProfit: Number(row.take_profit || 0),
    exit: Number(row.exit_price || 0),
    lotSize: Number(row.lot_size || 0),
    riskAmount: Number(row.risk_amount || 0),
    rr: Number(row.rr || 0),
    pl: Number(row.profit_loss || 0),
    resultPercent: Number(row.result_percent || 0),
    session: row.session || 'London',
    setup: row.setup_type || 'Manual',
    status: row.status || 'Open',
    confluences: row.confluences || '',
    reasonForEntry: row.reason_for_entry || '',
    mistakes: row.mistakes || '',
    psychologyNotes: row.psychology_notes || ''
  };
}

async function loadTradesFromCloud() {
  const user = await getCurrentUser();
  if (!user || !sbClient) return false;

  const { data, error } = await sbClient
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: false })
    .order('trade_time', { ascending: false });

  if (error) {
    console.error('Cloud load failed', error);
    setAuthFeedback(`Cloud load failed: ${error.message}`, true);
    return false;
  }

  trades = (data || []).map(mapDbToTrade);
  saveTrades();
  renderDashboard();
  return true;
}

async function saveTradeToCloud(trade) {
  const user = await getCurrentUser();
  if (!user || !sbClient) return false;

  const payload = mapTradeToDb(trade, user.id);

  const { data, error } = await sbClient
    .from('trades')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Cloud save failed', error);
    setAuthFeedback(`Cloud save failed: ${error.message}`, true);
    return false;
  }

  trade.id = data.id;
  return true;
}

async function refreshAuthUI() {
  const loggedOutView = document.getElementById('loggedOutView');
  const loggedInView = document.getElementById('loggedInView');
  const userEmail = document.getElementById('userEmail');
  const cloudStatus = document.getElementById('cloudStatus');

  if (!loggedOutView || !loggedInView) return;

  if (!sbClient) {
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
    setAuthFeedback('Supabase failed to load. Please refresh the page.', true);
    return;
  }

  try {
    const { data, error } = await sbClient.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (session?.user) {
      loggedOutView.style.display = 'none';
      loggedInView.style.display = 'block';
      if (userEmail) userEmail.textContent = session.user.email || '-';
      if (cloudStatus) cloudStatus.textContent = 'Authenticated';
      setAuthFeedback('Logged in successfully.');
      await loadTradesFromCloud();
    } else {
      loggedOutView.style.display = 'block';
      loggedInView.style.display = 'none';
      if (userEmail) userEmail.textContent = '-';
      if (cloudStatus) cloudStatus.textContent = 'Not connected';
      setAuthFeedback('Not logged in. Your trades save locally for now.');
      trades = loadTrades();
      renderDashboard();
    }
  } catch (error) {
    console.error('Failed to refresh auth UI', error);
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
    setAuthFeedback(error.message || 'Authentication error.', true);
  }
}

async function handleSignUp() {
  if (!sbClient) return;

  const email = document.getElementById('authEmail')?.value?.trim();
  const password = document.getElementById('authPassword')?.value || '';

  if (!email || !password) {
    setAuthFeedback('Enter your email and password first.', true);
    return;
  }

  setAuthFeedback('Creating account...');

  try {
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) throw error;
    setAuthFeedback('Account created. Check your email if confirmation is enabled.');
    await refreshAuthUI();
  } catch (error) {
    console.error('Signup failed', error);
    setAuthFeedback(error.message || 'Sign up failed.', true);
  }
}

async function handleSignIn() {
  if (!sbClient) return;

  const email = document.getElementById('authEmail')?.value?.trim();
  const password = document.getElementById('authPassword')?.value || '';

  if (!email || !password) {
    setAuthFeedback('Enter your email and password first.', true);
    return;
  }

  setAuthFeedback('Signing in...');

  try {
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthFeedback('Logged in.');
    await refreshAuthUI();
  } catch (error) {
    console.error('Login failed', error);
    setAuthFeedback(error.message || 'Log in failed.', true);
  }
}

async function handleLogOut() {
  if (!sbClient) return;

  try {
    const { error } = await sbClient.auth.signOut();
    if (error) throw error;
    setAuthFeedback('Logged out.');
    await refreshAuthUI();
  } catch (error) {
    console.error('Logout failed', error);
    setAuthFeedback(error.message || 'Log out failed.', true);
  }
}

/* ===============================
   TRADE SUBMIT
================================= */

async function handleTradeSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const entry = parseNumber(form.entryPrice.value);
  const stop = parseNumber(form.stopLoss.value);
  const takeProfit = parseNumber(form.takeProfit.value);
  const exit = parseNumber(form.exitPrice.value);
  const riskAmount = parseNumber(form.riskAmount.value);
  let rr = parseRRValue(form.riskReward.value);
  let pl = parseNumber(form.profitLoss.value);
  const direction = form.direction.value;

  if (!pl && riskAmount && rr) {
    pl = riskAmount * rr;
  }

  if (!rr) {
    const riskPerUnit = Math.abs(entry - stop);
    const rewardPerUnit = direction === 'Buy' ? exit - entry : entry - exit;
    rr = riskPerUnit ? rewardPerUnit / riskPerUnit : 0;
  }

  const status = deriveStatus(pl, form.status.value);

  const trade = {
    date: form.tradeDate.value,
    time: form.tradeTime.value,
    pair: form.instrument.value.trim() || 'XAUUSD',
    dir: direction,
    entry,
    stopLoss: stop,
    takeProfit,
    exit,
    rr: Number(rr.toFixed(2)),
    pl: Number(pl.toFixed(2)),
    session: form.session.value,
    setup: form.setupType.value.trim() || 'Manual',
    status,
    lotSize: parseNumber(form.lotSize.value),
    riskAmount: Number(riskAmount.toFixed(2)),
    resultPercent: parseNumber(form.resultPercent.value),
    confluences: form.confluences.value.trim(),
    reasonForEntry: form.reasonForEntry.value.trim(),
    mistakes: form.mistakes.value.trim(),
    psychologyNotes: form.psychologyNotes.value.trim()
  };

  trades.unshift(trade);
  saveTrades();

  const user = await getCurrentUser();
  if (user) {
    await saveTradeToCloud(trade);
    await loadTradesFromCloud();
  } else {
    renderDashboard();
  }

  if (feedback) {
    feedback.textContent = `Trade added: ${trade.pair} ${trade.dir} on ${trade.date}. Overview, analytics, and charts have been updated.`;
  }

  form.reset();
  form.instrument.value = trade.pair;
  form.direction.value = 'Buy';
  form.tradeDate.value = trade.date;
  form.tradeTime.value = trade.time;
  form.session.value = 'London';
  form.setupType.value = 'Breakout Retest';
  form.status.value = 'Closed Win';
  form.riskReward.value = '1:1.8';
  form.profitLoss.value = '+$270';
  form.resultPercent.value = '+1.8%';

  switchTab('analytics');
}

/* ===============================
   EVENT BINDINGS
================================= */

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

if (journalForm) {
  journalForm.addEventListener('submit', handleTradeSubmit);
}

const newTradeBtn = document.getElementById('newTradeBtn');
const openJournalBtn = document.getElementById('openJournalBtn');
const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');

[newTradeBtn, openJournalBtn].forEach(button => {
  if (button) button.addEventListener('click', () => switchTab('journal'));
});

if (viewAnalyticsBtn) {
  viewAnalyticsBtn.addEventListener('click', () => switchTab('analytics'));
}

const signUpBtn = document.getElementById('signUpBtn');
const signInBtn = document.getElementById('signInBtn');
const logOutBtn = document.getElementById('logOutBtn');

if (signUpBtn) signUpBtn.addEventListener('click', handleSignUp);
if (signInBtn) signInBtn.addEventListener('click', handleSignIn);
if (logOutBtn) logOutBtn.addEventListener('click', handleLogOut);

if (sbClient) {
  sbClient.auth.onAuthStateChange(() => {
    refreshAuthUI();
  });
}

/* ===============================
   STARTUP
================================= */

renderDashboard();
refreshAuthUI();
window.addEventListener('resize', drawAllCharts);
