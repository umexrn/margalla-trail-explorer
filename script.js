// Margalla Trail Explorer

let trails = [];

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
  if (d.includes("moderate") && d.includes("hard")) return "difficulty-moderate-hard";
  if (d.includes("easy") && !d.includes("moderate")) return "difficulty-easy";
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
    grid.appendChild(card);
  });
}
