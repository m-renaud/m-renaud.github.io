var Chart = (function(window, d3) {
    // Configuration
    var config = {
	flightsDataFile: "flights.psv",
	colorScheme: d3.schemeCategory10,
    }

    var data;
    var svg, title, x, y, xAxis, yAxis, legend, dim, chartWrapper, line, path;
    var margin = {}, width, height;

    // Action handlers.
    var tooltipMouseover, tooltipMouseout, flightClick;
    
    var breakPoint = 768;

    // Defines the color scheme for the data points.
    var color = d3.scaleOrdinal(config.colorScheme);

    // Parse a date in YYYY-MM-DD format.
    var parseDate = d3.timeParse("%Y-%m-%d");

    
    // Retrieve the data from the "pipe-separated value" (PSV) file.
    d3.dsv("|", config.flightsDataFile, function(d) {
	return {
	    date: parseDate(d.date),
	    site: d.site,
	    wing: d.wing,
	    minutes: +d.minutes,
	    doarama: d.doarama,
	    comments: d.comments
	}
    }).then(init);

    // Escape the provided text 't' so that it can be rendered as HTML.
    function escapeHtml(t) {
	return $('<div/>').text(t).html();
    }

    function siteHtml(site) {
	return "<span style='color:" + color(site) + ";'>" + site + "</span>"
    }

    function wingHtml(wing) {
	return "<span style='color:gray'>[" + escapeHtml(wing) + "]</span>"
    }

    // Given a 'flight', return the HTML to show in the tooltip when the mouse is
    // hovered over it.
    //
    // Output:
    //   <site> [<wing>]
    //   <description>
    function createTooltipHtml(flight) {
	var trimmedCommentText = flight.comments;
	if (trimmedCommentText.length > 150) {
	    trimmedCommentText = trimmedCommentText.substring(0, 150) + "...";
	}

	var commentsHtml = flight.comments ?
	    escapeHtml(trimmedCommentText)
	    : "<span style='color: gray'>" + escapeHtml("<no comments>") + "</span>";
	return siteHtml(flight.site) + "  " + wingHtml(flight.wing) + "<br/>"
	    + commentsHtml + "<br/>"
	    + (flight.comments ? "<span style='color:green'>Click for more info.</span>" : "");
    }

    function dateHtml(date) {
	var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
	return date.toLocaleDateString("en-US", options);
    }

    // Given a 'flight', return the HTML which contains all info about the flight.
    // This is displayed below the plot when a flight is clicked on.
    function createMoreInfoHtml(flight) {
	var commentsHtml = flight.comments ?
	    escapeHtml(flight.comments)
	    : "<span style='color: gray'>" + escapeHtml("<no comments>") + "</span>";
	return siteHtml(flight.site) + "  " + wingHtml(flight.wing) + " - " + dateHtml(flight.date) + "<br/><br/>"
	    + commentsHtml + "<br/>"
	    + (flight.doarama ? "<br/><a href='https://doarama.com/view/" + flight.doarama + "'>View flight on Doarama</a>" : "");
    }

    function clearMoreInfoSection() {
	d3.select('#more-info').html("");    
    }

    function resetFlightDots() {
	d3.selectAll(".dot")
	    .style("opacity", 1)
	    .style("stroke", "#333")
	    .style("fill", function (flight) { return color(flight.site); });
    }

    function resetLegend() {
	d3.selectAll(".legend")
	    .transition()
	    .duration(200)
	    .style("opacity", 1);
	resetFlightDots();
    }

    function flyingDays(data) {
	var dates = data.map((flight) => flight.date);
	var uniqueDates = dates.filter(
	    (date, index, arr) =>
		index && arr[index].getTime() !== arr[index-1].getTime());
	console.log(uniqueDates);
	
	return uniqueDates.length;
    }

    function flyingHours(data) {
	var totalMinutes =
	    data.reduce((accumulator, flight) => accumulator + flight.minutes, 0);
	var totalHours = totalMinutes / 60;
	return totalHours.toFixed(1);
    }

    function numberOfFlights(data) {
	return data.length;
    }

    function summaryHtml(data) {
	return "Flying days: " + flyingDays(data)
	    + ", Total flights: " + numberOfFlights(data)
	    + ", Hours: " + flyingHours(data);
	
    }

    function init(psv) {
	data = psv;

	d3.select('#summary').html(summaryHtml(data));

	xExtent = d3.extent(data, function(d,i) { return d.date });
	yExtent = d3.extent(data, function(d,i) { return d.value });
	x = d3.scaleTime().domain(xExtent);
	y = d3.scaleLinear().domain(yExtent);
	
	console.log("x: " + x);
	console.log("y: " + x);

	//initialize axis
	xAxis = d3.axisBottom(x);
	yAxis = d3.axisLeft(y);


	// Create the SVG canvas within the svg-container div.
	svg = d3.select("#svg-container").append("svg");
	chartWrapper = svg.append("g");
	chartWrapper.append('g').classed('x axis', true);
	chartWrapper.append('g').classed('y axis', true);

	// ----------------------------------------------------------------------
	// Tooltip
	//
	// On mouse-over the site, wing, and description should be shown inline.
	//
	// Clicking on the data point will show all info below the graph.
	// ----------------------------------------------------------------------

	// Add the tooltip container to the SVG container.
	// It's invisible by default and its position/contents are defined during
	// mouseover event handling.
	var tooltip = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .style("opacity", 0);

	tooltipMouseover = function(flight) {
	    var left = x(flight.date) + 70;
	    if (left + 300 > width) {
		left = left - 340;
	    }

	    var top = y(flight.minutes);
	    
	    tooltip.html(createTooltipHtml(flight))
		.style("left", left + "px")
		.style("top", top + "px")
		.style("width", "300px")
		.style("padding", "4px")
		.transition()
		.duration(200)
		.style("opacity", .9);
	};

	tooltipMouseout = function(flight) {
	    tooltip.transition()
		.duration(300)
		.style("opacity", 0);
	};

	flightClick = function(flight, i) {
	    resetFlightDots();

	    d3.selectAll('.dot').style("opacity", 0.4);
	    clearMoreInfoSection();
	    d3.select('#more-info').append("div")
		.html(createMoreInfoHtml(flight));
	    d3.select(this).style("fill", "yellow")
		.style("opacity", 1.0)
		.moveToFront();
	}

	d3.selection.prototype.moveToFront = function() {
	    return this.each(function(){
		this.parentNode.appendChild(this);
	    });
	};

	d3.select("body")
	    .on("keydown", function() {
		if (d3.event.keyCode == 27) {
		    resetLegend();
		    resetFlightDots();
		    clearMoreInfoSection();
		}
	    });


	// --------------------------------------------------
	// Data points (flights)
	// --------------------------------------------------

	svg.selectAll(".dot")
	    .data(data)
	    .enter()
	    .append("circle")
	    .classed("dot", true)
	    .attr("r", 6)
	    .style("stroke", "#333")
	    .style('fill', function(flight) { return color(flight.site); })
	    .style("cursor", "pointer")
	    .on("mouseover", tooltipMouseover)
	    .on("mouseout", tooltipMouseout)
	    .on("mousedown", flightClick);


	title = svg.append("text")
	    .style("text-anchor", "middle")
	    .style('font-size', '20px')
	    .text("Flights");

	// --------------------------------------------------
	// Legend
	// --------------------------------------------------

	legend = svg.selectAll('.legend')
	    .data(color.domain())
	    .enter().append('g')
	    .style("cursor", "pointer")
	    .attr('class', 'legend');
	
	legend.append('rect')
	    .attr('width', 18)
	    .attr('height', 18)
	    .style('fill', color);

	legend.append('text')
	    .attr('y', 9)
	    .attr('dy', '.35em')
	    .style('text-anchor', 'end')
	    .text(function(site) { return site; });

	legend.on("click", function(site) {
	    // If you click the same site again, remove the filter.
	    if (site == selectedSite) {
		resetLegend();
		return;
	    }

	    // Save which site is currently being filtered.
	    // This is used to toggle site filtering when the same site is
	    // clicked twice.
	    selectedSite = site;

	    // Dim all legend items, then un-dim the selected one.
	    d3.selectAll(".legend").style("opacity", 0.1);
	    d3.select(this).style("opacity", 1);

	    d3.selectAll(".dot")
		.transition()
		.duration(200)
		.style("opacity", 0.0)
		.style("opacity", 1)
		.style("stroke", "#333")
		.style("fill", function (flight) {
		    return (site == undefined || flight.site == site)
			? color(site)
			: "#eee";
		});
	});

	render();
    }

    // Creates a scatterplot from the flight data in 'config.flightsDataFile' (PSV format).
    //
    // You can hover over a flight to see the description, and clicking on it reveals more
    // information below the plot. You can also filter by site by clicking on a
    // site in the legend.
    function render() {
	updateDimensions(window.innerWidth);

	// Update svg elements to new dimensions.
	svg
	    .attr('width', width + margin.right + margin.left)
	    .attr('height', height + margin.top + margin.bottom);
	chartWrapper
	    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	title
	    .attr("y", 10)
	    .attr("x", width / 2)
	    .attr("dy", "1em");

	legend
	    .attr('transform', function(site, i) { return 'translate(0,' + ((i * 20) + margin.top) + ')'; });

	var legendOffset = 18 - margin.right;

	svg.selectAll('.legend')
	    .select('rect')
	    .attr('x', width - legendOffset);

	legend.select('text')
	    .attr('x', width - legendOffset - 6)

	
	// Update the axis.
	x.range([0, width])
	y.range([height, 0])
		  
	// Scale the range of the data
	x.domain(d3.extent(data, function(flight) { return flight.date; }));
	y.domain([0, d3.max(data, function(flight) { return flight.minutes; })]);

	xAxis.scale(x);
	yAxis.scale(y);

	svg.select('.x.axis')
	    .attr('transform', 'translate(0,' + height + ')')
	    .call(xAxis);

	svg.select('.y.axis')
	    .call(yAxis);

	svg.selectAll(".dot")
	    .data(data)
	    .enter()
	    .attr("cx", function(flight) { return x(flight.date); })
	    .attr("cy", function(flight) { return y(flight.minutes); });

	svg.selectAll(".dot")
	    .attr("cx", function(flight) { return x(flight.date) + margin.left; })
	    .attr("cy", function(flight) { return y(flight.minutes) + margin.top; });
    }

    function updateDimensions(winWidth) {
	margin.top = 50;
	margin.right = 50;
	margin.left = 50;
	margin.bottom = 50;

	margin.right = winWidth < breakPoint ? 0 : margin.right;
	margin.left = winWidth < breakPoint ? 0 : margin.left;

	width = winWidth - margin.left - margin.right - 20;
	height = 0.4*width;
    }

    return {
	render : render
    }
})(window,d3);
