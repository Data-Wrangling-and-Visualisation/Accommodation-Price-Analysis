fetch('/api/mortgage-data')
  .then(res => res.json())
  .then(data => {
    const parseDate = d3.timeParse("%Y-%m-%d");
    data.forEach(d => {
      d.date = parseDate(d.date);
      d.rate = +d["Yearly rate (%)"];
      d.newMortgages = +d["New mortgages"];
      d.newMortgageAmount = +d["New mortgage amount (millions)"];
    });

    const margin = {top: 20, right: 400, bottom: 30, left: 50},
          width = 1200 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);

    const yLeft = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.rate)]).nice()
      .range([height, 0]);

    const yRight = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.newMortgages, d.newMortgageAmount))]).nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(["Yearly Rate (%)", "New Mortgages", "Mortgage Amount (millions)"])
      .range(["steelblue", "orange", "green"]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(yLeft));

    svg.append("g")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yRight));

    const line = (key, yScale) => d3.line()
      .x(d => x(d.date))
      .y(d => yScale(d[key]));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color("Yearly Rate (%)"))
      .attr("stroke-width", 2)
      .attr("d", line("rate", yLeft));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color("New Mortgages"))
      .attr("stroke-width", 2)
      .attr("d", line("newMortgages", yRight));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color("Mortgage Amount (millions)"))
      .attr("stroke-width", 2)
      .attr("d", line("newMortgageAmount", yRight));

    // Tooltip elements
    const focus = svg.append("g").style("display", "none");

    focus.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "gray")
      .attr("stroke-dasharray", "3,3");

    const tooltip = d3.select("#chart")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none");

    const bisectDate = d3.bisector(d => d.date).left;

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focus.style("display", null);
        tooltip.style("display", null);
      })
      .on("mouseout", () => {
        focus.style("display", "none");
        tooltip.style("display", "none");
      })
      .on("mousemove", function(event) {
        const mouse = d3.pointer(event, this);
        const x0 = x.invert(mouse[0]);
        const i = bisectDate(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.date > d1.date - x0 ? d1 : d0;

        focus.select("line")
          .attr("transform", `translate(${x(d.date)},0)`);

        tooltip
          .html(`
            <strong>${d3.timeFormat("%Y-%m-%d")(d.date)}</strong><br/>
            📈 Rate: ${d.rate.toFixed(2)}%<br/>
            🏠 Mortgages: ${d.newMortgages}<br/>
            💰 Amount: ${d.newMortgageAmount.toLocaleString()}M
          `)
          .style("left", (x(d.date) + margin.left + 15) + "px")
          .style("top", (yLeft(d.rate) + margin.top + 500) + "px");
      });

    // Legend
    const legend = svg.selectAll(".legend")
      .data(["Yearly Rate (%)", "New Mortgages", "Mortgage Amount (millions)"])
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 30})`);

    legend.append("rect")
      .attr("x", width + 60)
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", d => color(d));

    legend.append("text")
      .attr("x", width + 76)
      .attr("y", 6)
      .attr("dy", "0.35em")
      .text(d => d);
  });

