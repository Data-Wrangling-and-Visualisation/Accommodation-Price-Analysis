let data = [];
const colorModes = {
    cluster: { scale: d3.scaleOrdinal(d3.schemeTableau10) },
    price: { 
        scale: d3.scaleLinear()
            .domain([100000, 300000, 500000])
            .range(['#32CD32', '#FFD700', '#FF4500', '#8B0000'])
    }
};

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