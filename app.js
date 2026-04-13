const tabs = document.querySelectorAll(".nav-tab");
const panels = document.querySelectorAll(".tab-panel");
const pageTitle = document.getElementById("pageTitle");

const recentTrades = [
  { date: "2026-04-12", pair: "XAUUSD", dir: "Buy", entry: "2348.2", exit: "2359.8", rr: "1.9R", pl: "+$380", session: "London", setup: "Retest", status: "Win" },
  { date: "2026-04-11", pair: "XAUUSD", dir: "Sell", entry: "2361.4", exit: "2352.6", rr: "1.6R", pl: "+$240", session: "New York", setup: "Reversal", status: "Win" },
  { date: "2026-04-10", pair: "XAUUSD", dir: "Buy", entry: "2339.7", exit: "2334.1", rr: "-1R", pl: "-$150", session: "London", setup: "Breakout", status: "Loss" },
  { date: "2026-04-09", pair: "XAUUSD", dir: "Buy", entry: "2328.4", exit: "2340.2", rr: "2.0R", pl: "+$410", session: "Asia", setup: "Sweep", status: "Win" }
];

const equityData = [10000, 10120, 10040, 10260, 10390, 10310, 10480, 10610, 10540, 10820];
const drawdownData = [0, -0.8, -0.4, -1.5, -0.6, -2.2, -1.4, -3.1, -2.4, -1.2];
const sessionData = [
  { label: "London", value: 68 },
  { label: "New York", value: 54 },
  { label: "Asia", value: 29 }
];
const setupData = [
  { label: "Retest", value: 74 },
  { label: "Breakout", value: 61 },
  { label: "Sweep", value: 81 },
  { label: "Reversal", value: 57 }
];
const marketPrices = [2328, 2334, 2331, 2340, 2348, 2342, 2351, 2359, 2354, 2362, 2368, 2361];
const monthlyPerformance = [4, 6, 3, 8, 5, 9, 7, 10];

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    tabs.forEach(b => b.classList.remove("active"));
    panels.forEach(panel => panel.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(target).classList.add("active");
    pageTitle.textContent = btn.textContent;

    requestAnimationFrame(drawAllCharts);
  });
});

function populateTables() {
  const recentBody = document.getElementById("recentTradesTable");
  const journalBody = document.getElementById("journalTable");

  recentBody.innerHTML = recentTrades.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.pair}</td>
      <td>${t.dir}</td>
      <td>${t.entry}</td>
      <td>${t.exit}</td>
      <td>${t.rr}</td>
      <td>${t.pl}</td>
    </tr>
  `).join("");

  journalBody.innerHTML = recentTrades.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.session}</td>
      <td>${t.setup}</td>
      <td>${t.status}</td>
      <td>${t.rr}</td>
      <td>${t.pl}</td>
    </tr>
  `).join("");
}

function populateSessionBars() {
  const wrap = document.getElementById("sessionBars");
  wrap.innerHTML = sessionData.map(item => `
    <div class="bar-row">
      <span>${item.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${item.value}%"></div></div>
    </div>
  `).join("");
}

function setupCanvas(canvasId, height = 320) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(canvas.clientWidth, 300);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { canvas, ctx, width, height };
}

function drawGrid(ctx, width, height, pad) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
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
  if (!setup) return;
  const { ctx, width, height } = setup;
  const pad = 26;
  drawGrid(ctx, width, height, pad);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1);

  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = options.color || "#d4af37";

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
    ctx.fillStyle = options.point || "#f0d37a";
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBarChart(canvasId, items, options = {}) {
  const setup = setupCanvas(canvasId, options.height || 320);
  if (!setup) return;
  const { ctx, width, height } = setup;
  const pad = 24;
  drawGrid(ctx, width, height, pad);
  const max = Math.max(...items.map(i => i.value), 1);
  const barWidth = (width - pad * 2) / items.length * 0.58;

  items.forEach((item, index) => {
    const xStep = (width - pad * 2) / items.length;
    const x = pad + index * xStep + (xStep - barWidth) / 2;
    const barHeight = (item.value / max) * (height - pad * 2 - 24);
    const y = height - pad - barHeight;

    ctx.fillStyle = options.color || "#d4af37";
    roundRect(ctx, x, y, barWidth, barHeight, 10, true);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "12px Arial";
    ctx.fillText(item.label, x, height - 8);
  });
}

function drawMonthlyBars(canvasId, data) {
  const items = data.map((v, i) => ({ label: `M${i + 1}`, value: v }));
  drawBarChart(canvasId, items, { color: "#f0d37a", height: 320 });
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

function updateChartStats() {
  const bias = marketPrices[marketPrices.length - 1] > marketPrices[0] ? "Bullish" : "Bearish";
  const range = (Math.max(...marketPrices) - Math.min(...marketPrices)).toFixed(1);
  document.getElementById("currentBias").textContent = bias;
  document.getElementById("currentRange").textContent = range;
  document.getElementById("currentMomentum").textContent = bias === "Bullish" ? "Positive follow-through" : "Weakening move";
}

function drawAllCharts() {
  drawLineChart("equityChart", equityData, { color: "#d4af37", point: "#f0d37a", height: 380 });
  drawBarChart("sessionChart", sessionData, { color: "#d4af37", height: 320 });
  drawLineChart("drawdownChart", drawdownData, { color: "#8fb5ff", point: "#8fb5ff", height: 320 });
  drawBarChart("setupChart", setupData, { color: "#f0d37a", height: 320 });
  drawLineChart("marketChart", marketPrices, { color: "#d4af37", point: "#f0d37a", height: 380 });
  drawMonthlyBars("monthlyChart", monthlyPerformance);
  updateChartStats();
}

populateTables();
populateSessionBars();
drawAllCharts();

window.addEventListener("resize", drawAllCharts);
