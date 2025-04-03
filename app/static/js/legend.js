function updateLegend() {
    const mode = document.getElementById('color-mode').value;
    const legend = d3.select('#legend').html(''); // Clear the legend

    if (mode === 'cluster') {
        const clusters = [...new Set(data.map(d => d.cluster))].sort();
        legend.append('div').text('Кластеры').style('font-weight', 'bold');

        clusters.forEach(cluster => {
            const row = legend.append('div').style('display', 'flex');
            row.append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('background', colorModes.cluster.scale(cluster))
                .style('margin-right', '8px');
            row.append('span').text(`Кластер ${cluster}`);
        });
    } else {
        legend.append('div').text('Цена за м²').style('font-weight', 'bold');
        const domain = colorModes.price.scale.domain();
        const range = colorModes.price.scale.range();

        domain.forEach((d, i) => {
            const row = legend.append('div').style('display', 'flex');
            row.append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('background', range[i])
                .style('margin-right', '8px');
            row.append('span').text(`${d.toLocaleString()} ₽`);
        });
    }
}

function getColor(item) {
    const mode = document.getElementById('color-mode').value;
    return colorModes[mode].scale(
        mode === 'cluster' ? item.cluster : item.price_per_sqm_adjusted
    );
}