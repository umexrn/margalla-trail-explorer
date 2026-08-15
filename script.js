// Margalla Trail Explorer

let trails = [];
let currentTrail = null;
let currentHikeData = null;

const MARGALLA_LAT = 33.7515;
const MARGALLA_LON = 73.0433;

fetch("trails.json")
  .then(res => res.json())
  .then(data => {
    trails = data;
    renderTrails();
  })
  .catch(err => {
    console.error("Failed to load trails.json", err);
  });

function difficultyClass(difficulty) {
  const d = difficulty.toLowerCase();
  if (d.includes("easy") && d.includes("moderate")) return "difficulty-easy-moderate";
  if (d.includes("moderate") && d.includes("hard")) return "difficulty-moderate-hard";
  if (d.includes("easy")) return "difficulty-easy";
  if (d.includes("hard")) return "difficulty-hard";
  return "difficulty-moderate";
}

function shortTrailLabel(name) {
  const match = name.match(/Trail\s*\d+/i);
  return match ? match[0].toUpperCase() : name.toUpperCase();
}

function renderTrails() {
  const grid = document.getElementById("trailGrid");
  grid.innerHTML = "";

  trails.forEach(trail => {
    const card = document.createElement("div");
    card.className = "trail-card";
    card.innerHTML = `
      <div class="trail-card-image" style="--bg-img:url('${trail.image}')"></div>
      <div class="trail-card-body">
        <h3>${trail.name}</h3>
        <div class="trail-meta">
          <span class="meta-tag">${trail.length_km} km</span>
          <span class="meta-tag">${trail.elevation_gain_m} m elevation</span>
          <span class="meta-tag ${difficultyClass(trail.difficulty)}">${trail.difficulty}</span>
        </div>
        <p class="desc">${trail.description}</p>
      </div>
    `;
    card.addEventListener("click", () => openTrailModal(trail));
    grid.appendChild(card);
  });
}

// ---------- Trail detail modal ----------
const trailModal = document.getElementById("trailModal");

function openTrailModal(trail) {
  currentTrail = trail;

  document.getElementById("modalImage").style.setProperty("--bg-img", `url('${trail.image}')`);
  document.getElementById("modalName").textContent = trail.name;
  document.getElementById("modalDesc").textContent = trail.description;

  document.getElementById("modalMeta").innerHTML = `
    <span class="meta-tag">${trail.length_km} km</span>
    <span class="meta-tag">${trail.elevation_gain_m} m elevation</span>
    <span class="meta-tag ${difficultyClass(trail.difficulty)}">${trail.difficulty}</span>
  `;

  const wildlifeList = document.getElementById("modalWildlife");
  wildlifeList.innerHTML = "";
  (trail.wildlife || []).forEach(animal => {
    const li = document.createElement("li");
    li.textContent = animal;
    wildlifeList.appendChild(li);
  });

  trailModal.showModal();
}

document.getElementById("closeModal").addEventListener("click", () => {
  trailModal.close();
});

// ---------- Plan a Hike modal ----------
const planModal = document.getElementById("planModal");
const planForm = document.getElementById("planForm");

document.getElementById("planHikeBtn").addEventListener("click", () => {
  trailModal.close();
  document.getElementById("planTrailName").textContent = currentTrail.name;
  planForm.reset();
  document.getElementById("pDate").value = new Date().toISOString().split("T")[0];
  planModal.showModal();
  fetchWeather(document.getElementById("pDate").value);
});

document.getElementById("pDate").addEventListener("change", (e) => {
  fetchWeather(e.target.value);
});

document.getElementById("closePlanModal").addEventListener("click", () => {
  planModal.close();
});

// ---------- Weather / hazard check (up to 16-day forecast) ----------
function fetchWeather(selectedDateStr) {
  const statusEl = document.getElementById("weatherStatus");
  statusEl.textContent = "Checking weather...";
  statusEl.className = "weather-status";

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${MARGALLA_LAT}&longitude=${MARGALLA_LON}&daily=precipitation_sum&timezone=auto&forecast_days=16`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const dayIndex = data.daily.time.indexOf(selectedDateStr);

      if (dayIndex === -1) {
        statusEl.textContent = "Forecast unavailable for this date (only available up to 16 days ahead). The receipt won't show a conditions badge.";
        statusEl.className = "weather-status weather-unknown";
        window.currentHazard = null;
        return;
      }

      const rain = data.daily.precipitation_sum[dayIndex];
      let level, className, hazardLabel, hazardColor;

      if (rain >= 15) {
        level = `Heavy rain forecast (${rain} mm) — Flash flood risk. Hike with caution.`;
        className = "weather-hazard";
        hazardLabel = "RAIN HAZARD ⚠";
        hazardColor = "#ef4444";
      } else if (rain >= 5) {
        level = `Moderate rain forecast (${rain} mm) — Trail may be slippery.`;
        className = "weather-caution";
        hazardLabel = "USE CAUTION ⚠";
        hazardColor = "#eab308";
      } else {
        level = `Clear conditions forecast (${rain} mm) — Safe to hike.`;
        className = "weather-safe";
        hazardLabel = "CLEAR CONDITIONS ✓";
        hazardColor = "#22c55e";
      }

      statusEl.textContent = level;
      statusEl.className = `weather-status ${className}`;
      window.currentHazard = { rain, hazardLabel, hazardColor };
    })
    .catch(err => {
      console.error("Weather fetch failed", err);
      statusEl.textContent = "Weather unavailable — check conditions before hiking.";
      statusEl.className = "weather-status weather-unknown";
      window.currentHazard = null;
    });
}

// ---------- Form submit → build receipt ----------
planForm.addEventListener("submit", (e) => {
  e.preventDefault();

  currentHikeData = {
    trail: currentTrail,
    date: document.getElementById("pDate").value,
    time: document.getElementById("pTime").value,
    names: document.getElementById("pNames").value.split(",").map(n => n.trim()).filter(Boolean),
    hazard: window.currentHazard,
    customImage: null
  };

  planModal.close();
  document.getElementById("resetPhotoBtn").hidden = true;
  generateReceipt(currentHikeData);
});

// ---------- Receipt generation ----------
function generateReceipt(hikeData) {
  const bgImage = hikeData.customImage || hikeData.trail.receipt_image || hikeData.trail.image;
  document.getElementById("receiptBg").style.setProperty("--bg-img", `url('${bgImage}')`);
  document.getElementById("rTrailNumber").textContent = shortTrailLabel(hikeData.trail.name);

  const formattedDate = new Date(hikeData.date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  document.getElementById("rDate").textContent = formattedDate;

  const timeEl = document.getElementById("rTimeTop");
  if (hikeData.time) {
    const [h, m] = hikeData.time.split(":");
    const hour12 = ((+h % 12) || 12);
    const ampm = +h < 12 ? "AM" : "PM";
    timeEl.textContent = `${hour12}:${m} ${ampm}`;
    timeEl.style.display = "block";
  } else {
    timeEl.style.display = "none";
  }

  const namesList = document.getElementById("rNamesList");
  namesList.innerHTML = "";
  hikeData.names.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    namesList.appendChild(li);
  });

  const hazardEl = document.getElementById("rHazard");
  if (hikeData.hazard) {
    hazardEl.textContent = hikeData.hazard.hazardLabel;
    hazardEl.style.background = hikeData.hazard.hazardColor;
    hazardEl.style.color = "#0f0f10";
    hazardEl.style.display = "inline-block";
  } else {
    hazardEl.style.display = "none";
  }

  const template = document.getElementById("receiptTemplate");

  document.fonts.ready.then(() => {
    html2canvas(template, { width: 1080, height: 1920, scale: 1, useCORS: true }).then(canvas => {
      const previewCanvas = document.getElementById("receiptCanvas");
      previewCanvas.width = canvas.width;
      previewCanvas.height = canvas.height;
      const ctx = previewCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, 0);

      window.currentReceiptCanvas = canvas;
      document.getElementById("receiptModal").showModal();
    });
  });
}

document.getElementById("closeReceiptModal").addEventListener("click", () => {
  document.getElementById("receiptModal").close();
});

document.getElementById("downloadReceiptBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "hike-receipt.png";
  link.href = window.currentReceiptCanvas.toDataURL("image/png");
  link.click();
});

document.getElementById("shareReceiptBtn").addEventListener("click", () => {
  window.currentReceiptCanvas.toBlob(blob => {
    const file = new File([blob], "hike-receipt.png", { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: "My Hike Plan",
        text: "Planning a hike at Margalla Hills!"
      }).catch(err => console.log("Share cancelled or failed", err));
    } else {
      alert("Direct sharing isn't supported on this browser/device. Please use Download and share manually.");
    }
  }, "image/png");
});

// ---------- Custom photo upload ----------
const photoUploadInput = document.getElementById("photoUploadInput");

document.getElementById("uploadPhotoBtn").addEventListener("click", () => {
  photoUploadInput.click();
});

photoUploadInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    currentHikeData.customImage = event.target.result;
    document.getElementById("resetPhotoBtn").hidden = false;
    generateReceipt(currentHikeData);
  };
  reader.readAsDataURL(file);
});

document.getElementById("resetPhotoBtn").addEventListener("click", () => {
  currentHikeData.customImage = null;
  document.getElementById("resetPhotoBtn").hidden = true;
  generateReceipt(currentHikeData);
});
