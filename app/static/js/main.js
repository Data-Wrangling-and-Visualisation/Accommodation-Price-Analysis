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

// Функция для извлечения параметров из формы AI
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

// Функция для вызова API предсказания
async function callExtendedPredictionAPI(payload) {
  const res = await fetch('/predict_with_importance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function callPredictionAPI(payload) {
  const res = await fetch('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

// Функция для отрисовки слоя Делоне (вместо heatmap)
// heatmapData — массив формата [lat, lon, price]
function renderDelaunay(heatmapData) {
  drawDelaunayLayer(heatmapData);
}

// Основная инициализация
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

// Переключатель режимов
// main.js - Update the mode toggle functionality
document.getElementById('toggle-mode-btn').addEventListener('click', () => {
    mode = (mode === 'historical') ? 'ai' : 'historical';
    const aiMode = mode === 'ai';
    
    document.querySelector('.sidebar-section:first-child').style.display = aiMode ? 'none' : 'block';
    document.getElementById('ai-controls').style.display = aiMode ? 'block' : 'none';
    document.getElementById('toggle-mode-btn').textContent = aiMode ? 
        'Исторический режим' : 'Симулятор Набиуллиной';
    
    clearMap();
    if (!aiMode) updateMap();
});

// Rest of the main.js remains the same

// Обработка отправки формы AI
document.getElementById('ai-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMap();

  // 1. Извлечение параметров формы
  const commonParams = getAIFormParameters(e.target);

  // 2. Получение данных и выбор случайной выборки
  const response = await fetch('/data');
  const allData = await response.json();
  const sample = allData.sort(() => 0.5 - Math.random()).slice(0, 50);

  // 3. Для каждой точки выполняется вызов API и формирование точек для отрисовки Делоне
  const delaunayPoints = await Promise.all(sample.map(async (point) => {
    const payload = { 
      ...commonParams, 
      latitude: point.latitude, 
      longitude: point.longitude 
    };

    const result = await callPredictionAPI(payload);
    return [point.latitude, point.longitude, result.price];
  }));

  // 4. Отрисовка триангуляции Делоне
  renderDelaunay(delaunayPoints);

  // Сохраняем для последующих операций (например, поиска ближайшей точки)
  aiPredictionPoints = delaunayPoints.map(p => ({ lat: p[0], lon: p[1], price: p[2] }));
});
