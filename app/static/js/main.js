let data = [];
const colorModes = {
    cluster: { 
        scale: d3.scaleOrdinal(d3.schemeTableau10) 
    },
    price: { 
        scale: createDetailedPriceScale(50000, 500000, 10) // Create a detailed scale with 10 categories
    }
};

// Function to create a detailed price scale
function createDetailedPriceScale(minValue, maxValue, numCategories) {
    const domain = d3.range(minValue, maxValue + 1, (maxValue - minValue) / (numCategories - 1));
    const colors = d3.interpolateRgbBasis(['#32CD32', '#FFD700', '#FF4500', '#8B0000']); // Gradient colors
    const range = d3.range(0, 1.01, 1 / (numCategories - 1)).map(colors); // Generate colors based on interpolation
    return d3.scaleLinear()
        .domain(domain)
        .range(range);
}

async function init() {
    try {
        const response = await fetch('/data');
        data = await response.json();
        
        // Инициализация карты ПЕРЕД фильтрами
        initMap();
        
        // Инициализация фильтров
        initFilters(data);
        
        // Первый рендер
        updateMap();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);