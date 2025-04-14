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

    const commonParams = getAIFormParameters(document.getElementById('ai-form'));
    const payload = { 
      ...commonParams, 
      latitude: lat, 
      longitude: lng
    };

    const result = await callExtendedPredictionAPI(payload);
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

function showSHAPPopup(lat, lon, result) {
  const importance = result.feature_importance;

  const top = Object.entries(importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topFeatures = top
    .map(([feature, value]) => `${feature}: ${(value).toFixed(2)}%`)
    .join('<br>');

  const content = `
    <strong>Price predicted:</strong> ${Math.round(result.price).toLocaleString()} ₽<br>
    <strong>Top-5 reasons:</strong><br>
    ${topFeatures}
  `;

  L.popup()
    .setLatLng([lat, lon])
    .setContent(content)
    .openOn(map);
}
