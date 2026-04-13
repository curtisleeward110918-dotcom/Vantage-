const appScreen = document.getElementById("app");
const dashboardScreen = document.getElementById("dashboard");
const enterBtn = document.getElementById("enterBtn");
const previewBtn = document.getElementById("previewBtn");
const backBtn = document.getElementById("backBtn");
const refreshBtn = document.getElementById("refreshBtn");

enterBtn.addEventListener("click", startApp);
previewBtn.addEventListener("click", startApp);
backBtn.addEventListener("click", goBack);
refreshBtn.addEventListener("click", loadChart);

function startApp() {
  appScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  loadChart();
}

function goBack() {
  dashboardScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

async function loadChart() {
  try {
    const response = await fetch("./data.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Could not load data.json");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data is empty or invalid");
    }

    const prices = data
      .map(item => Number(item.price))
      .filter(Number.isFinite);

    if (prices.length === 0) {
      throw new Error("No valid price values found");
    }

    updateStats(prices);
    drawChart(prices);
  } catch (error) {
    console.error("Dashboard load error:", error);
    alert("The chart data could not be loaded. Make sure index.html, styles.css, app.js, and data.json are all in the same folder.");
  }
}

function updateStats(prices) {
  const first = prices[0];
  const last = prices[prices.length - 1];
  const netMove = last - first;
  const range = Math.max(...prices) - Math.min(...prices);

  let wins = 0;
  let bestMove = -Infinity;
  let worstMove = Infinity;

  for (let i = 1; i < prices.length; i++) {
    const move = prices[i] - prices[i - 1];
    if (move > 0) wins++;
    if (move > bestMove) bestMove = move;
    if (move < worstMove) worstMove = move;
  }

  const totalMoves = Math.max(prices.length - 1, 1);
  const winRate = Math.round((wins / totalMoves) * 100);
  const bias = netMove > 0 ? "Bullish" : netMove < 0 ? "Bearish" : "Neutral";

  document.getElementById("winRate").textContent = `${winRate}%`;
  document.getElementById("heroWinRate").textContent = `${winRate}%`;
  document.getElementById("tradeCount").textContent = String(prices.length);
  document.getElementById("netMove").textContent = `${netMove > 0 ? "+" : ""}${netMove}`;
  document.getElementById("sessionRange").textContent = String(range);
  document.getElementById("bestMove").textContent = `${bestMove > 0 ? "+" : ""}${bestMove}`;
  document.getElementById("worstMove").textContent = `${worstMove > 0 ? "+" : ""}${worstMove}`;
  document.getElementById("heroBias").textContent = bias;
  document.getElementById("dashboardBias").textContent = bias;
}

function drawChart(prices) {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  const parentWidth = canvas.parentElement.clientWidth;
  canvas.width = Math.max(parentWidth - 2, 320);
  canvas.height = window.innerWidth < 680 ? 320 : 420;

  const paddingLeft = 54;
  const paddingBottom = 34;
  const paddingTop = 20;
  const paddingRight = 18;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(maxPrice - minPrice, 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawAxes(ctx, canvas, paddingLeft, paddingTop, paddingRight, paddingBottom);
  drawPriceLabels(ctx, canvas, paddingLeft, paddingTop, paddingBottom, minPrice, maxPrice);
  drawLine(ctx, canvas, prices, minPrice, range, paddingLeft, paddingTop, paddingRight, paddingBottom);
}

function drawAxes(ctx, canvas, left, top, right, bottom) {
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, canvas.height - bottom);
  ctx.lineTo(canvas.width - right, canvas.height - bottom);
  ctx.stroke();
}

function drawPriceLabels(ctx, canvas, left, top, bottom, minPrice, maxPrice) {
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px Arial";
  ctx.fillText(String(maxPrice), 8, top + 4);
  ctx.fillText(String(minPrice), 8, canvas.height - bottom + 4);
}

function drawLine(ctx, canvas, prices, minPrice, range, left, top, right, bottom) {
  const usableWidth = canvas.width - left - right;
  const usableHeight = canvas.height - top - bottom;
  const stepX = prices.length > 1 ? usableWidth / (prices.length - 1) : usableWidth;

  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#d4af37";

  prices.forEach((price, index) => {
    const x = left + index * stepX;
    const y = top + (1 - ((price - minPrice) / range)) * usableHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  prices.forEach((price, index) => {
    const x = left + index * stepX;
    const y = top + (1 - ((price - minPrice) / range)) * usableHeight;

    ctx.beginPath();
    ctx.fillStyle = "#f0d37a";
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

window.addEventListener("resize", () => {
  if (!dashboardScreen.classList.contains("hidden")) {
    loadChart();
  }
});
