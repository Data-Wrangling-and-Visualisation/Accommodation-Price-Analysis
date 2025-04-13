let map;
let markers;
let heatLayer;
let aiPredictionPoints = [];

function initMap() {
  map = L.map('map').setView([43.6, 39.7], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  markers = L.markerClusterGroup({
    maxClusterRadius: 80,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
  });

  markers.addTo(map);

  map.on('click', async (e) => {
    if (mode !== 'ai') return;

    const { lat, lng } = e.latlng;
    const nearest = findNearestPredictedPoint(lat, lng);
    if (!nearest) return;

    const formData = new FormData(document.getElementById('ai-form'));
    const payload = Object.fromEntries(formData.entries());
    payload.latitude = nearest.lat;
    payload.longitude = nearest.lon;
    payload.date = new Date(payload.date).toISOString().split('T')[0];
    payload.floor = parseInt(payload.floor);
    payload.floors_count = parseInt(payload.floors_count);
    payload.rooms_count = parseInt(payload.rooms_count);
    payload.total_meters = parseFloat(payload.total_meters);

    const res = await fetch('/predict_with_importance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    showSHAPPopup(lat, lng, result);
  });
}

function updateMap() {
  if (mode !== 'historical') return;
  if (!markers) return;

  const filteredData = filterData(data);
  updateLegend();

  markers.clearLayers();
  filteredData.forEach(item => {
    const color = getColor(item);
    const marker = L.circleMarker([item.latitude, item.longitude], {
      radius: 8,
      fillColor: color,
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).bindPopup(`
      Цена: ${d3.format(",")(item.price)} ₽<br>
      Цена/м²: ${d3.format(",.0f")(item.price_per_sqm_adjusted)} ₽<br>
      Дата: ${item.date}<br>
      Кластер: ${item.cluster}
    `);

    markers.addLayer(marker);
  });
}

function clearMap() {
  if (typeof markers !== 'undefined') markers.clearLayers();
  if (typeof heatLayer !== 'undefined') map.removeLayer(heatLayer);
}

function drawHeatmap(points) {
  heatLayer = L.heatLayer(points, {
    radius: 25,
    blur: 20,
    maxZoom: 14,
  }).addTo(map);
}

function findNearestPredictedPoint(lat, lon) {
  let minDist = Infinity;
  let nearest = null;

  for (const p of aiPredictionPoints) {
    const d = Math.sqrt((p.lat - lat) ** 2 + (p.lon - lon) ** 2);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  return nearest;
}

function showSHAPPopup(lat, lon, result) {
  const importance = result.feature_importance;
  const top = Object.entries(importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const content = `
    <strong>Предсказанная цена:</strong> ${Math.round(result.price).toLocaleString()} ₽<br>
  `;

  L.popup()
    .setLatLng([lat, lon])
    .setContent(content)
    .openOn(map);
}
