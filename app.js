function startApp() {
  document.getElementById("app").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  loadChart();
}

async function loadChart() {
  try {
    const response = await fetch("data.json");

    if (!response.ok) {
      throw new Error("JSON not found");
    }

    const data = await response.json();

    console.log("Loaded Data:", data);

    drawChart(data);
  } catch (err) {
    console.error("Error loading chart:", err);
  }
}

function drawChart(data) {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  canvas.width = 600;
  canvas.height = 300;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();

  data.forEach((point, i) => {
    const x = i * 10;
    const y = canvas.height - point.price;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "gold";
  ctx.stroke();
}
