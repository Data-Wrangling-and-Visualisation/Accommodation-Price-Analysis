  let data = [];
let mode = 'historical';
const colorModes = {
  cluster: {
    scale: d3.scaleOrdinal(d3.schemeTableau10)
  },
  price: {
    scale: createDetailedPriceScale(50000, 500000, 2)
  }
};

// Create a detailed price scale with smooth color interpolation
function createDetailedPriceScale(minValue, maxValue, numCategories) {
  const domain = d3.range(minValue, maxValue + 1, (maxValue - minValue) / (numCategories - 1));
  const colors = d3.interpolateRgbBasis(['#32CD32', '#FFD700', '#FF4500', '#8B0000']);
  const range = d3.range(0, 1.01, 1 / (numCategories - 1)).map(colors);
  return d3.scaleLinear().domain(domain).range(range);
}

// Extract parameters from the AI form and normalize them for API usage
function getAIFormParameters(form) {
  const formData = new FormData(form);
  const params = Object.fromEntries(formData.entries());
  params.date = new Date(params.date).toISOString().split('T')[0];
  params.floor = parseInt(params.floor, 10);
  params.rooms_count = parseInt(params.rooms_count, 10);
  params.floors_count = parseInt(params.floors_count, 10);
  params.total_meters = parseFloat(params.total_meters);
  return params;
}

// Call the extended prediction API to get price predictions and feature importance
async function callExtendedPredictionAPI(payload) {
  const res = await fetch('/predict_with_importance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

// Call the basic prediction API to get only price predictions
async function callPredictionAPI(payload) {
  const res = await fetch('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

// Render Delaunay triangulation layer using heatmap data in [lat, lon, price] format
function renderDelaunay(heatmapData) {
  drawDelaunayLayer(heatmapData);
}

// Initialize the application by fetching data and setting up the map and filters
async function init() {
  try {
    const response = await fetch('/data');
    data = await response.json();

    initMap();
    initFilters(data);
    updateMap();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', init);

// Toggle between historical and AI modes
document.getElementById('toggle-mode-btn').addEventListener('click', () => {
  mode = (mode === 'historical') ? 'ai' : 'historical';
  const aiMode = mode === 'ai';
  
  // Show/hide relevant UI sections based on the selected mode
  document.querySelector('.sidebar-section:first-child').style.display = aiMode ? 'none' : 'block';
  document.getElementById('ai-controls').style.display = aiMode ? 'block' : 'none';
  document.getElementById('legend-container').style.display = aiMode ? 'none' : 'block';
  document.getElementById('toggle-mode-btn').textContent = aiMode ? 
      'Переключить в исторический режим' : 'Переключить в режим прогнозирования';
  
  clearMap();
  if (!aiMode) {
    updateLegend();
    updateMap();
  }
});

d3.select('#year-slider').on('input', () => {
  updateMap();
  updateLegend(); // Update legend when filters change
});

d3.select('#floor-slider').on('input', () => {
  updateMap();
  updateLegend(); // Update legend when filters change
});

// Handle AI form submission to generate Delaunay triangulation based on predictions
document.getElementById('ai-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMap();

  // Extract common parameters from the form
  const commonParams = getAIFormParameters(e.target);

  const response = await fetch('/data');
  const allData = await response.json();
  const sample = allData.sort(() => 0.5 - Math.random()).slice(0, 50);

  // Prepare batch payload
  const batchPayload = sample.map(point => ({
    ...commonParams,
    latitude: point.latitude,
    longitude: point.longitude
  }));

  // Call batch prediction API
  const result = await fetch('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchPayload)
  });
  const predictions = await result.json();

  // Prepare Delaunay points
  const delaunayPoints = sample.map((point, index) => [
    point.latitude,
    point.longitude,
    predictions.prices[index]
  ]);

  // Render Delaunay triangulation with the predicted points
  renderDelaunay(delaunayPoints);

  // Store prediction points for further operations
  aiPredictionPoints = delaunayPoints.map(p => ({ lat: p[0], lon: p[1], price: p[2] }));
});