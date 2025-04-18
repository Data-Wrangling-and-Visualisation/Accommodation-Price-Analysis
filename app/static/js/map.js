let map;
let markers;
let delaunaySvg;     // SVG layer for Delaunay triangulation
let delaunayGroup;   // Group inside SVG for drawing triangles
let aiPredictionPoints = [];
let currentDelaunayData = null; // Store data to correctly rebuild it on zoom changes

const MAX_POINTS = 1000;

function initMap() {
  map = L.map('map').setView([43.6, 39.7], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  // Заменяем MarkerClusterGroup на обычную группу слоев
  markers = L.layerGroup().addTo(map); // Теперь точки не кластеризуются

  // Инициализация SVG-слоя для Делоне
  initDelaunayOverlay();
  map.on('moveend zoomend', updateDelaunayOverlay);
  map.on('click', async (e) => {
    if (mode !== 'ai') return;
    const { lat, lng } = e.latlng;
    const commonParams = getAIFormParameters(document.getElementById('ai-form'));
    const payload = { ...commonParams, latitude: lat, longitude: lng };
    const result = await callExtendedPredictionAPI(payload);
    showSHAPPopup(lat, lng, result);
  });
}

function updateMap() {
  if (mode !== 'historical') return;
  if (!markers) return;

  let filteredData = filterData(data);
  if (filteredData.length > MAX_POINTS) {
    filteredData = filteredData
      .sort(() => 0.5 - Math.random())
      .slice(0, MAX_POINTS);
  }
  updateLegend();

  // Очищаем обычные маркеры
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
      Цена/м²: ${d3.format(",.0f")(item.price_per_sqm)} ₽<br>
      Дата: ${item.date}<br>
      Кластер: ${item.cluster}
    `);
    markers.addLayer(marker); // Добавляем маркеры напрямую
  });
}

function clearMap() {
  if (typeof markers !== 'undefined') markers.clearLayers();
  if (delaunayGroup) delaunayGroup.selectAll("path").remove();
}

/**
 * Initializes the SVG layer for Delaunay triangulation and adds it to the map's overlayPane.
 */
function initDelaunayOverlay() {
  delaunaySvg = d3.select(map.getPanes().overlayPane)
    .append("svg")
    .attr("class", "delaunay-overlay")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0.6);

  delaunayGroup = delaunaySvg.append("g").attr("class", "leaflet-zoom-hide");
  updateDelaunayOverlay();
}

/**
 * Updates the size and position of the Delaunay SVG layer according to the current map bounds and redraws triangles.
 */
function updateDelaunayOverlay() {
  const bounds = map.getBounds();
  const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
  const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());

  delaunaySvg
    .attr("width", bottomRight.x - topLeft.x)
    .attr("height", bottomRight.y - topLeft.y)
    .style("left", topLeft.x + "px")
    .style("top", topLeft.y + "px");

  // Shift the group so coordinates remain consistent relative to the map
  delaunayGroup.attr("transform", "translate(" + -topLeft.x + "," + -topLeft.y + ")");

  // If points for rendering were previously set, recalculate their positioning
  if (currentDelaunayData) {
    drawDelaunayLayer(currentDelaunayData);
  }
}

/**
 * Draws the Delaunay triangulation layer.
 * @param {Array} points - Array of points in the format [lat, lon, price].
 */
function drawDelaunayLayer(points) {
  // Save data for re-rendering on zoom/pan
  currentDelaunayData = points;
  // Remove previous triangles
  delaunayGroup.selectAll("path").remove();

  // Create a color scale for prices (from green to dark red)
  const prices = points.map(p => p[2]);
  const priceExtent = d3.extent(prices);
  const colorScale = d3.scaleLinear()
    .domain(priceExtent)
    .range(["#32CD32", "#8B0000"]);

  // Convert geographic coordinates to layer coordinates
  const projectedPoints = points.map(p => {
    const pt = map.latLngToLayerPoint([p[0], p[1]]);
    return { x: pt.x, y: pt.y, price: p[2] };
  });

  // Compute Delaunay triangulation
  const delaunay = d3.Delaunay.from(projectedPoints, d => d.x, d => d.y);
  const triangles = delaunay.triangles;

  for (let i = 0; i < triangles.length; i += 3) {
    const a = projectedPoints[triangles[i]];
    const b = projectedPoints[triangles[i + 1]];
    const c = projectedPoints[triangles[i + 2]];

    const avgPrice = (a.price + b.price + c.price) / 3;

    delaunayGroup.append("path")
      .attr("d", `M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}Z`)
      .attr("fill", colorScale(avgPrice))
      .attr("stroke", "none");
  }
}

function showSHAPPopup(lat, lon, result) {
  const importance = result.feature_importance;

  const top = Object.entries(importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topFeatures = top
    .map(([feature, value]) => `${feature}: ${value.toFixed(2)}%`)
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