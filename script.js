// Margalla Trail Explorer

let trails = [];
let currentTrail = null;

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
  fetchWeather();
});

document.getElementById("closePlanModal").addEventListener("click", () => {
  planModal.close();
});

// ---------- Weather / hazard check ----------
function fetchWeather() {
  const statusEl = document.getElementById("weatherStatus");
  statusEl.textContent = "Checking weather...";
  statusEl.className = "weather-status";

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${MARGALLA_LAT}&longitude=${MARGALLA_LON}&current=precipitation,rain&timezone=auto`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const rain = data.current?.precipitation ?? 0;
      let level, className;

      if (rain >= 7.5) {
        level = `Heavy rain (${rain} mm/hr) — Flash flood risk. Hike with caution.`;
        className = "weather-hazard";
      } else if (rain >= 2.5) {
        level = `Moderate rain (${rain} mm/hr) — Trail may be slippery.`;
        className = "weather-caution";
      } else {
        level = `Clear conditions (${rain} mm/hr) — Safe to hike.`;
        className = "weather-safe";
      }

      statusEl.textContent = level;
      statusEl.className = `weather-status ${className}`;
      window.currentHazard = { rain, className };
    })
    .catch(err => {
      console.error("Weather fetch failed", err);
      statusEl.textContent = "Weather unavailable — check conditions before hiking.";
      statusEl.className = "weather-status weather-caution";
      window.currentHazard = { rain: null, className: "weather-caution" };
    });
}

// ---------- Form submit (receipt generation wired up next step) ----------
planForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const hikeData = {
    trail: currentTrail,
    date: document.getElementById("pDate").value,
    peopleCount: Number(document.getElementById("pPeopleCount").value),
    names: document.getElementById("pNames").value.split(",").map(n => n.trim()).filter(Boolean),
    hazard: window.currentHazard
  };

  console.log("Hike plan submitted:", hikeData);
  // Next step: generate the shareable receipt image from this data
});
