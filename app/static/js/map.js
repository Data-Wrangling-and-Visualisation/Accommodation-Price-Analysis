let map;
let markers;

function initMap() {
    map = L.map('map').setView([43.6, 39.7], 12);
    
    // Добавление слоя карты
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    // Инициализация кластерной группы
    markers = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
    });
    
    markers.addTo(map);
}

function updateMap() {
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
        })
        .bindPopup(`
            Цена: ${d3.format(",")(item.price)} ₽<br>
            Цена/м²: ${d3.format(",.0f")(item.price_per_sqm_adjusted)} ₽<br>
            Дата: ${item.date}<br>
            Кластер: ${item.cluster}
        `);
        
        markers.addLayer(marker);
    });
}