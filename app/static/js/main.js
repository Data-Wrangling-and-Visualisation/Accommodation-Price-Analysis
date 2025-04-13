let data = [];
let mode = 'historical';
const colorModes = {
  cluster: {
    scale: d3.scaleOrdinal(d3.schemeTableau10)
  },
  price: {
    scale: createDetailedPriceScale(50000, 500000, 10)
  }
};

function createDetailedPriceScale(minValue, maxValue, numCategories) {
  const domain = d3.range(minValue, maxValue + 1, (maxValue - minValue) / (numCategories - 1));
  const colors = d3.interpolateRgbBasis(['#32CD32', '#FFD700', '#FF4500', '#8B0000']);
  const range = d3.range(0, 1.01, 1 / (numCategories - 1)).map(colors);
  return d3.scaleLinear().domain(domain).range(range);
}

async function init() {
  try {
    const response = await fetch('/data');
    data = await response.json();

    initMap();
    initFilters(data);
    updateMap();
  } catch (error) {
    console.error('Ошибка инициализации:', error);
  }
}

document.addEventListener('DOMContentLoaded', init);

// Mode toggle
document.getElementById('toggle-mode-btn').addEventListener('click', () => {
  mode = (mode === 'historical') ? 'ai' : 'historical';

  const aiMode = mode === 'ai';
  document.querySelector('.controls').style.display = aiMode ? 'none' : 'flex';
  document.getElementById('ai-banner').style.display = aiMode ? 'block' : 'none';
  document.getElementById('ai-controls').style.display = aiMode ? 'block' : 'none';
  document.getElementById('toggle-mode-btn').textContent = aiMode ? 'Исторические данные' : 'Симулятор Набиулинной';

  clearMap();
  if (!aiMode) updateMap();
});

// AI Form submit
document.getElementById('ai-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  clearMap();

  const formData = new FormData(e.target);
  const commonParams = Object.fromEntries(formData.entries());
  commonParams.date = new Date(commonParams.date).toISOString().split('T')[0];
  commonParams.floor = parseInt(commonParams.floor);
  commonParams.rooms_count = parseInt(commonParams.rooms_count);
  commonParams.floors_count = parseInt(commonParams.floors_count);
  commonParams.total_meters = parseFloat(commonParams.total_meters);

  const response = await fetch('/data');
  const allData = await response.json();
  const sample = allData.sort(() => 0.5 - Math.random()).slice(0, 50);

  const heatmapPoints = await Promise.all(sample.map(async (point) => {
    const payload = {
      ...commonParams,
      latitude: point.latitude,
      longitude: point.longitude
    };

    const res = await fetch('/predict_with_importance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    return { lat: payload.latitude, lon: payload.longitude, price: result.price };
  }));

  const formatted = heatmapPoints.map(p => [p.lat, p.lon, p.price]);
  drawHeatmap(formatted);
  aiPredictionPoints = heatmapPoints;
});
