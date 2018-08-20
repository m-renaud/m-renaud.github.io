// Configuration
var config = {
    flightsDataFile: "flights.psv",
    colorScheme: d3.schemeCategory10,
    margin: {top: 50, right: 100, bottom: 70, left: 50},
}

var width = 1200 - config.margin.left - config.margin.right;
var height = 700 - config.margin.top - config.margin.bottom;

// Defines the color scheme for the data points.
var color = d3.scaleOrdinal(config.colorScheme);

// Parse a date in YYYY-MM-DD format.
var parseDate = d3.timeParse("%Y-%m-%d");

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

var selectedFlight = undefined;
var selectedSite = undefined;

function clearMoreInfoSection() {
    d3.select('#more-info').html("");    
}

function resetFlightDots() {
    d3.selectAll(".dot")
	.style("opacity", 1)
	.style("stroke", "#333")
	.style("fill", function (flight) { return color(flight.site); });
    selectedFlight = undefined;
}

function resetLegend() {
    d3.selectAll(".legend")
	.transition()
	.duration(200)
	.style("opacity", 1);
    selectedSite = undefined;    
    resetFlightDots();
}

// Creates a scatterplot from the flight data in 'config.flightsDataFile' (PSV format).
//
// You can hover over a flight to see the description, and clicking on it reveals more
// information below the plot. You can also filter by site by clicking on a
// site in the legend.
function createFlightsScatterPlot() {
    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    // Create the SVG canvas within the svg-container div.
    var svg = d3.select("#svg-container")
	.append("svg")
        .attr("width", width + config.margin.left + config.margin.right)
        .attr("height", height + config.margin.top + config.margin.bottom)
	.append("g")
        .attr("transform", "translate(" + config.margin.left + "," + config.margin.top + ")");

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
    var tooltip = d3.select("#svg-container").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

    var tooltipMouseover = function(flight) {
	tooltip.html(createTooltipHtml(flight))
            .style("left", (d3.event.pageX + 20) + "px")
            .style("top", (d3.event.pageY - 30) + "px")
	    .style("width", "400px")
	    .style("padding", "4px")
            .transition()
            .duration(200)
            .style("opacity", .9)
    };

    var tooltipMouseout = function(flight) {
	tooltip.transition()
            .duration(300)
            .style("opacity", 0);
    };

    var flightClick = function(flight) {
	d3.select(selectedFlight).style("fill", color(flight.site));
	d3.selectAll('.dot').style("opacity", 0.4);
	
	selectedFlight = this;

	d3.select('#more-info').html("");
	d3.select('#more-info').append("div")
	    .style("left", "20px")
	    .style("top", "1000px")
	    .html(createMoreInfoHtml(flight));
	d3.select(this).style("fill", "yellow").style("opacity", 1.0).moveToFront();
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
    }).then(function (data) {
	// Scale the range of the data
	x.domain(d3.extent(data, function(flight) { return flight.date; }));
	y.domain([0, d3.max(data, function(flight) { return flight.minutes; })]);

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
	    .attr("cx", function(flight) { return x(flight.date); })
	    .attr("cy", function(flight) { return y(flight.minutes); })
	    .style("cursor", "pointer")
	    .on("mouseover", tooltipMouseover)
	    .on("mouseout", tooltipMouseout)
	    .on("mousedown", flightClick);

	// --------------------------------------------------
	// Title and axis
	// --------------------------------------------------

	// Title
	svg.append("text")
	    .attr("y", 10 - config.margin.top)
	    .attr("x", width / 2)
	    .attr("dy", "1em")
	    .style("text-anchor", "middle")
	    .style('font-size', '20px')
	    .text("Flights");

	// X-Axis
	svg.append('g')
	    .attr('transform', 'translate(0,' + height + ')')
	    .call(d3.axisBottom(x));

	svg.append("text")
	    .attr("transform", "translate(" + (width/2) + " ," + (height + config.margin.top) + ")")
	    .style("text-anchor", "middle")
	    .text("Date");

	// Y-Axis
	svg.append('g')
	    .call(d3.axisLeft(y));

	svg.append("text")
	    .attr("transform", "rotate(-90)")
	    .attr("y", 0 - config.margin.left)
	    .attr("x",0 - (height / 2))
	    .attr("dy", "1em")
	    .style("text-anchor", "middle")
	    .text("Flight time (min)");

	// --------------------------------------------------
	// Legend
	// --------------------------------------------------

	var legend = svg.selectAll('.legend')
	    .data(color.domain())
	    .enter().append('g')
	    .style("cursor", "pointer")
	    .attr('class', 'legend')
	    .attr('transform', function(site, i) { return 'translate(0,' + i * 20 + ')'; });

	var legendOffset = 18 - config.margin.right;

	legend.append('rect')
	    .attr('x', width - legendOffset)
	    .attr('width', 18)
	    .attr('height', 18)
	    .style('fill', color);

	legend.append('text')
	    .attr('x', width - legendOffset - 6)
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
		})

	});
    });
}
