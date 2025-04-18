function updateLegend() {
    const mode = document.getElementById('color-mode').value;
    const legend = d3.select('#legend').html(''); // Clear the legend
    
    if (mode === 'cluster') {
        // Existing cluster legend code remains unchanged
        const clusters = [...new Set(data.map(d => d.cluster))].sort();
        legend.append('div')
            .text('Кластеры')
            .style('font-weight', 'bold')
            .style('margin-bottom', '8px');
        
        clusters.forEach(cluster => {
            const row = legend.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('margin-bottom', '4px');
                
            row.append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('background', colorModes.cluster.scale(cluster))
                .style('margin-right', '8px');
                
            row.append('span').text(`Кластер ${cluster}`);
        });
        
    } else {
        // Continuous price legend
        legend.append('div')
            .text('Цена за м²')
            .style('font-weight', 'bold')
            .style('margin-bottom', '8px');
        
        const [min, max] = colorModes.price.scale.domain();
        const step = (max - min) / 5; // Divide into 5 segments
        
        // Create gradient container with fixed width
        const gradientWidth = 200; // Fixed width for gradient
        const gradientHeight = 20; // Height of gradient bar
        
        // Create gradient background
        const gradient = legend.append('div')
            .style('position', 'relative')
            .style('width', `${gradientWidth}px`)
            .style('height', `${gradientHeight}px`)
            .style('background', `linear-gradient(to right, 
                ${colorModes.price.scale.range().join(', ')})`)
            .style('margin-bottom', '8px');
        
        // Add axis ticks and labels
        const tickContainer = legend.append('div')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('width', `${gradientWidth}px`);
        
        for (let i = 0; i <= 5; i++) {
            const value = Math.round(min + step * i);
            tickContainer.append('div')
                .style('text-align', 'center')
                .style('width', `${gradientWidth / 5}px`)
                .html(`<span style="writing-mode: vertical-rl; transform: rotate(180deg);">${d3.format(",")(value)} ₽</span>`);
        }
    }
}

function getColor(item) {
    const mode = document.getElementById('color-mode').value;
    return colorModes[mode].scale(
        mode === 'cluster' ? item.cluster : item.price_per_sqm
    );
}