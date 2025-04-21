// Initialize price range sliders
function initPriceRangeSliders(data) {
    const prices = data.map(d => d.price_per_sqm);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const priceMinSlider = document.getElementById('price-min');
    const priceMaxSlider = document.getElementById('price-max');
    const priceMinValue = document.getElementById('price-min-value');
    const priceMaxValue = document.getElementById('price-max-value');

    // Set initial attributes for sliders
    priceMinSlider.min = Math.floor(minPrice);
    priceMinSlider.max = Math.floor(maxPrice);
    priceMaxSlider.min = Math.floor(minPrice);
    priceMaxSlider.max = Math.floor(maxPrice);

    priceMinSlider.value = Math.floor(minPrice);
    priceMaxSlider.value = Math.floor(maxPrice);

    priceMinValue.textContent = `${Math.floor(minPrice).toLocaleString()} ₽`;
    priceMaxValue.textContent = `${Math.floor(maxPrice).toLocaleString()} ₽`;

    // Add event listeners for synchronization
    priceMinSlider.addEventListener('input', () => {
        if (parseInt(priceMinSlider.value) > parseInt(priceMaxSlider.value)) {
            priceMinSlider.value = priceMaxSlider.value; // Prevent overlap
        }
        priceMinValue.textContent = `${parseInt(priceMinSlider.value).toLocaleString()} ₽`;
        updateMap();
    });

    priceMaxSlider.addEventListener('input', () => {
        if (parseInt(priceMaxSlider.value) < parseInt(priceMinSlider.value)) {
            priceMaxSlider.value = priceMinSlider.value; // Prevent overlap
        }
        priceMaxValue.textContent = `${parseInt(priceMaxSlider.value).toLocaleString()} ₽`;
        updateMap();
    });
}

function initFilters(data) {
    // Year slider
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

    // Floor slider
    const floors = data.map(d => d.floor);
    const maxFloor = Math.max(...floors);
    
    d3.select('#floor-slider')
        .attr('max', maxFloor)
        .on('input', () => {
            document.getElementById('floor-value').textContent = 
                document.getElementById('floor-slider').value;
            updateMap();
        });

    initPriceRangeSliders(data);
    
    const maxRooms = Math.max(...data.map(d => d.rooms_count));
    d3.select('#rooms-slider')
        .attr('min', 1)
        .attr('max', maxRooms)
        .on('input', () => {
            document.getElementById('rooms-value').textContent = 
                document.getElementById('rooms-slider').value;
            updateMap();
        });

    // Color mode selector
    d3.select('#color-mode').on('change', updateMap);
}

function filterData(data) {
    const year = +document.getElementById('year-slider').value;
    const minFloor = +document.getElementById('floor-slider').value;
    const minPrice = +document.getElementById('price-min').value;
    const maxPrice = +document.getElementById('price-max').value;
    const roomsCount = +document.getElementById('rooms-slider').value;
    
    return data.filter(d => {
        const dateYear = new Date(d.date).getFullYear();
        return (
            dateYear === year &&
            d.floor >= minFloor &&
            d.price_per_sqm >= minPrice &&
            d.price_per_sqm <= maxPrice &&
            d.rooms_count === roomsCount
        );
    });
}