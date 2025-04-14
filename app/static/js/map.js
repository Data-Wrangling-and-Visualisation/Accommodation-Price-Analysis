let map;
let markers;
let delaunaySvg;     // SVG-слой для триангуляции Делоне
let delaunayGroup;   // Группа внутри SVG для отрисовки треугольников
let aiPredictionPoints = [];
let currentDelaunayData = null; // Храним данные, чтобы корректно их перестраивать при изменении масштаба

function initMap() {
  map = L.map('map').setView([43.6, 39.7], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  markers = L.markerClusterGroup({
    maxClusterRadius: 80,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
  });
  markers.addTo(map);

  // Инициализация SVG-слоя для триангуляции Делоне
  initDelaunayOverlay();

  // При изменении положения или зума карты обновляем оверлей и пересчитываем проекции
  map.on('moveend zoomend', updateDelaunayOverlay);

  // Обработка клика для AI-предсказания
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
  if (delaunayGroup) delaunayGroup.selectAll("path").remove();
}

/**
 * Инициализирует SVG-слой для триангуляции Делоне и добавляет его в overlayPane карты.
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
 * Обновляет размеры и положение SVG-слоя для Делоне согласно текущим границам карты и перерисовывает треугольники.
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

  // Сдвигаем группу таким образом, чтобы координаты оставались неизменными относительно карты
  delaunayGroup.attr("transform", "translate(" + -topLeft.x + "," + -topLeft.y + ")");

  // Если ранее заданы точки для отрисовки, пересчитываем их позиционирование
  if (currentDelaunayData) {
    drawDelaunayLayer(currentDelaunayData);
  }
}

/**
 * Отрисовывает слой триангуляции Делоне.
 * @param {Array} points - Массив точек в формате [lat, lon, price].
 */
function drawDelaunayLayer(points) {
  // Сохраняем данные для возможности переотрисовки при зуме/панораме
  currentDelaunayData = points;
  // Удаляем предыдущие треугольники
  delaunayGroup.selectAll("path").remove();

  // Создаем цветовую шкалу для цены (от зелёного до темно-красного)
  const prices = points.map(p => p[2]);
  const priceExtent = d3.extent(prices);
  const colorScale = d3.scaleLinear()
    .domain(priceExtent)
    .range(["#32CD32", "#8B0000"]);

  // Переводим географические координаты в координаты слоя
  const projectedPoints = points.map(p => {
    const pt = map.latLngToLayerPoint([p[0], p[1]]);
    return { x: pt.x, y: pt.y, price: p[2] };
  });

  // Вычисляем Делоне триангуляцию
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
