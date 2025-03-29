function initFilters(data) {
    // Годовой ползунок
    const years = data.map(d => new Date(d.date).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    
    d3.select('#year-slider')
        .attr('min', minYear)
        .attr('max', maxYear)
        .on('input', () => {
            document.getElementById('year-value').textContent = 
                document.getElementById('year-slider').value;
            updateMap();
        });

    // Ползунок этажей
    const floors = data.map(d => d.floor);
    const maxFloor = Math.max(...floors);
    
    d3.select('#floor-slider')
        .attr('max', maxFloor)
        .on('input', () => {
            document.getElementById('floor-value').textContent = 
                document.getElementById('floor-slider').value;
            updateMap();
        });

    // Режим окраски
    d3.select('#color-mode').on('change', updateMap);
}

function filterData(data) {
    const year = +document.getElementById('year-slider').value;
    const minFloor = +document.getElementById('floor-slider').value;
    
    return data.filter(d => {
        const dateYear = new Date(d.date).getFullYear();
        return dateYear === year && d.floor >= minFloor;
    });
}