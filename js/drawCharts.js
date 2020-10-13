var pymChild = null;
var pulseData;

var margin = {
    top: 10,
    right: 10,
    bottom: 50,
    left: 33
};

var width,
    height;

var x = d3.scaleBand()
    .paddingInner(0.2)
    .paddingOuter(0.8);

var y = d3.scaleLinear()
    .domain([0,1]);

var PCTFORMAT = d3.format(".0%");
var num_ticks = 10;

var initial_indicator = "food_insufficient";

// dummy data so that elements are entered on the National graph on load
// as placeholders for the state/MSA-specific points
// the chart initializes with US as the selected geo so only
// half of the points will be drawn on the first small multiple chart if we don't
// add placeholders for future state or MSA-level data
var dummy_obs = {
    geo_type: "state",
    geography: "dummy data",
    mean: -1,
    metric: "uninsured",
    moe_95: 0,
    moe_95_lb: 0,
    moe_95_ub: 0,
    race_var: "total",
    se: 0,
    sigdiff: 0,
    // week_num: "wk1_2",
};

var dummy_state_data = [];


// Turn dropdowns into jQuery UI selectmenu
$( function() {
    $( "#metrics" ).selectmenu({
        change: function( event, data ) {
            update();
        },
    });
});

$( function() {
    $( "#states" ).selectmenu({
        change: function( event, data ) {
            update();
        },
    });
});

$( function() {
    $( "#msas" ).selectmenu({
        change: function( event, data ) {
            update();
        },
    });
});

function drawGraphic(containerWidth) {

    if(containerWidth < 392) {
        margin.bottom = 50;
    }

    width = (containerWidth < 450) ? containerWidth - margin.left - margin.right : 450 - margin.left - margin.right;
    height = (width * 0.66) - margin.top - margin.bottom;
    num_ticks = (containerWidth < 400) ? 5 : 10;

    x.rangeRound([0, width]);
    y.rangeRound([height, 0]);

    // clear divs before redrawing maps
    $(".chart.national svg").empty();
    $(".chart.asian svg").empty();
    $(".chart.black svg").empty();
    $(".chart.hispanic svg").empty();
    $(".chart.other svg").empty();
    $(".chart.white svg").empty();

    setupChart("national");
    setupChart("asian");
    setupChart("black");
    setupChart("hispanic");
    setupChart("other");
    setupChart("white");

    if (pymChild) {
        pymChild.sendHeight();
    }
}

// data can be found here: https://ui-census-pulse-survey.s3.amazonaws.com/rolling_all_to_current_week.csv
// NOTE: if the en dashes in the date ranges aren't showing up properly,
//       open the csv file in Sublime and go to File > Save with Encoding > UTF-8
d3.csv("data/phase2_all_to_current_week.csv", function(d) {
    return {
        metric: d.metric,
        race_var: d.race_var,
        week_num: d.week_num,
        geography: d.geography,
        mean: +d.mean,
        se: +d.se,
        geo_type: d.geo_type,
        moe_95: +d.moe_95,
        moe_95_lb: +d.moe_95_lb,
        moe_95_ub: +d.moe_95_ub,
        sigdiff: +d.sigdiff,
        date_int: d.date_int,
    };
}, function(error, data) {

    pulseData = data;

    var unique_weeks = d3.map(data, function(d) {return d.date_int;}).keys();
    x.domain(unique_weeks);

    unique_weeks.forEach(function(w) {
        dummy_obs.date_int = w;
        dummy_state_data.push(dummy_obs);

    });

    pymChild = new pym.Child({renderCallback: drawGraphic });

});

function setupChart(race) {
    var data;

    if(race === "national") {
        data = pulseData.filter(function(d) { return (d.geography === "US") &&
                                                        d.race_var === "total" &&
                                                        d.metric === initial_indicator; })
                        .concat(dummy_state_data);
    }
    else {
        data = pulseData.filter(function(d) { return d.geography === "US" &&
                                                        (d.race_var === race || d.race_var === "total") &&
                                                        d.metric === initial_indicator; });
    }
    // console.log(data);

    // insert chart title
    d3.select(".chart_title").text(chartTitles[initial_indicator]);

    // insert trend description
    d3.select(".trend_description").html(trendDescriptions[initial_indicator]);

    var svg = d3.select(".chart." + race + " svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    var g = svg
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    // add axes
    g.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(y).tickFormat(PCTFORMAT).tickSize(-width).ticks(num_ticks));

    g.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // if(width < 550) {
    //     d3.selectAll(".x-axis .tick text")
    //     .call(wrap, x.bandwidth());
    // }

    // draw margin of error bands
    g.selectAll(".moe")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", function(d) {
            if((d.geo_type === "national") && (d.race_var === "total")) return "national moe";
            else {
                if(d.race_var === "total") return "statelocal moe";
                else return "race moe";
            }
        })
        .attr("x", function(d) { return x(d.date_int); })
        .attr("y", function(d) {
            if(isNaN(d.moe_95_ub)) return y(0);
            else if(d.moe_95_ub > 1) return y(1);
            else return y(d.moe_95_ub);
         })
        .attr("width", function(d) { return x.bandwidth(); })
        .attr("height", function(d) {
            if(isNaN(d.moe_95_ub)) return 0;
            else if(d.moe_95_lb < 0 && d.moe_95_ub <= 1) return y(0) - y(d.moe_95_ub);
            else if(d.moe_85_lb >= 0 && d.moe_95_ub > 1) return y(d.moe_95_lb) - y(1);
            else if(d.moe_95_lb < 0 && d.moe_95_ub > 1) return y(0) - y(1);
            else return y(d.moe_95_lb) - y(d.moe_95_ub);
        })
        .classed("insig", function(d) {
            if(d.geography === "dummy data") return false;
            else if(d.race_var !== "total") return (d.sigdiff === 0);
            else if(race === "national") return (d.sigdiff === 0);
            else {
                // need to figure out if the overall average bar is statistically significantly different or not
                // based on whether the corresponding race-specific datum for that week is
                var corresponding_race_data = data.filter(function(x) { return (x.date_int === d.date_int) && (x.race_var !== "total"); });
                return corresponding_race_data[0].sigdiff === 0;
            }
        });

    // draw point estimate dots on top of all of the margin of error bands
    g.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", function (d) {
            if((d.geo_type === "national") && (d.race_var === "total")) return "national dot";
            else {
                if(d.race_var === "total") return "statelocal dot";
                else return "race dot";
            }
        })
        .attr("cx", function(d) { return x(d.date_int) + x.bandwidth()*.5; })
        .attr("cy", function(d) { return y(+d.mean); })
        .attr("r", 4)
        .classed("insig", function(d) {
            if(d.geography === "dummy data") return false;
            else if(d.race_var !== "total") return (d.sigdiff === 0);
            else if(race === "national") return (d.sigdiff === 0);
            else {
                // need to figure out if the overall average bar is statistically significantly different or not
                // based on whether the corresponding race-specific datum for that week is
                var corresponding_race_data = data.filter(function(x) { return (x.date_int === d.date_int) && (x.race_var !== "total"); });
                return corresponding_race_data[0].sigdiff === 0;
            }
        });
}

function update() {
    var metric = getMetric();

    // need to figure out which geography level is active
    var geo_level = getGeographyLevel();
    var geo;
    if(geo_level === "national") geo = "US";
    else if(geo_level === "state") geo = getGeography("state");
    else if(geo_level === "msa") geo = getGeography("msa");

    updateChart("national", metric, geo);
    updateChart("asian", metric, geo);
    updateChart("black", metric, geo);
    updateChart("hispanic", metric, geo);
    updateChart("other", metric, geo);
    updateChart("white", metric, geo);

    pymChild.sendHeight();
}

function updateChart(race, metric, geo) {
    var data;

    if(race === "national") {
        data = pulseData.filter(function(d) { return (d.geography === geo || d.geography === "US") &&
                                                        d.race_var === "total" &&
                                                        d.metric === metric; });
        if(geo === "US") {
            data = data.concat(dummy_state_data);
        }
    }
    else {
        data = pulseData.filter(function(d) { return d.geography === geo &&
                                                        (d.race_var === race || d.race_var === "total") &&
                                                        d.metric === metric; });
    }
// console.log(data);

    // update chart title
    d3.select(".chart_title").text(chartTitles[metric]);

    // insert trend description
    d3.select(".trend_description").html(trendDescriptions[metric]);

    var svg = d3.select(".chart." + race + " svg");

    // update margin of error bands
    svg.selectAll(".moe")
        .data(data)
        .attr("class", function(d) {
            if((d.geo_type === "national") && (d.race_var === "total")) return "national moe";
            else {
                if(d.race_var === "total") return "statelocal moe";
                else return "race moe";
            }
        })
        .attr("x", function(d) { return x(d.date_int); })
        .attr("y", function(d) {
            if(isNaN(d.moe_95_ub)) return y(0);
            else if(d.moe_95_ub > 1) return y(1);
            else return y(d.moe_95_ub); })
        .attr("width", function(d) { return x.bandwidth(); })
        .attr("height", function(d) {
            if(isNaN(d.moe_95_ub)) return 0;
            else if(d.moe_95_lb < 0 && d.moe_95_ub <= 1) return y(0) - y(d.moe_95_ub);
            else if(d.moe_95_lb >= 0 && d.moe_95_ub > 1) return y(d.moe_95_lb) - y(1);
            else if(d.moe_95_lb < 0 && d.moe_95_ub > 1) return y(0) - y(1);
            else return y(d.moe_95_lb) - y(d.moe_95_ub);
        })
        .classed("insig", function(d) {
            if(d.geography === "dummy data") return false;
            else if(d.race_var !== "total") return (d.sigdiff === 0);
            else if(race === "national") {
                if(geo !== "US") {
                    // if selected geo isn't US, on national plot, need to figure out if US average is
                    // statistically significant different
                    // or not based on whether the corresponding state or local datum for that week is
                    var corresponding_race_data = data.filter(function(x) { return (x.date_int === d.date_int) && (x.geography !== "US"); });
                    return corresponding_race_data[0].sigdiff === 0;
                }
                else return (d.sigdiff === 0);
            }
            else {
                // need to figure out if the overall average bar is statistically significantly different or not
                // based on whether the corresponding race-specific datum for that week is
                var corresponding_race_data = data.filter(function(x) { return (x.date_int === d.date_int) && (x.race_var !== "total"); });
                return corresponding_race_data[0].sigdiff === 0;
            }
        });

    // update point estimate dots
    svg.selectAll(".dot")
        .data(data)
        .attr("class", function (d) {
            if((d.geo_type === "national") && (d.race_var === "total")) return "national dot";
            else {
                if(d.race_var === "total") return "statelocal dot";
                else return "race dot";
            }
        })
        .attr("cx", function(d) { return x(d.date_int) + x.bandwidth()*.5; })
        .attr("cy", function(d) { return !isNaN(d.mean) ? y(+d.mean) : y(-1); })
        .classed("insig", function(d) {
            if(d.geography === "dummy data") return false;
            else if(d.race_var !== "total") return (d.sigdiff === 0);
            else if(race === "national") {
                if(geo !== "US") {
                    // if selected geo isn't US, on national plot, need to figure out if US average is
                    // statistically significant different
                    // or not based on whether the corresponding state or local datum for that week is
                    var corresponding_race_data = data.filter(function(x) { return (x.date_int === d.date_int) && (x.geography !== "US"); });
                    return corresponding_race_data[0].sigdiff === 0;
                }
                else return (d.sigdiff === 0);
            }
            else {
                // need to figure out if the overall average bar is statistically significantly different or not
                // based on whether the corresponding race-specific datum for that week is
                var corresponding_race_data = data.filter(function(x) { return (x.date_int === d.date_int) && (x.race_var !== "total"); });
                return corresponding_race_data[0].sigdiff === 0;
            }
        });
}

function getMetric() {
    return d3.select("#metrics").property("value");
}

function getGeographyLevel() {
    var geo_level = d3.selectAll("input[name='geo']:checked").property("value");

    // make sure appropriate dropdown menus are or aren't disabled based on selection
    if(geo_level === "national") {
        d3.select(".states.dropdown_container").classed("disabled", true);
        d3.select(".msas.dropdown_container").classed("disabled", true);
    }
    else if(geo_level === "state") {
        d3.select(".states.dropdown_container").classed("disabled", false);
        d3.select(".msas.dropdown_container").classed("disabled", true);
    }
    else if(geo_level === "msa") {
        d3.select(".states.dropdown_container").classed("disabled", true);
        d3.select(".msas.dropdown_container").classed("disabled", false);
    }

    return geo_level;
}

function getGeography(geo_level) {
    var dropdown = document.getElementById(geo_level + 's');
    var selected_geo = dropdown.options[dropdown.selectedIndex].value;
    return selected_geo;
}

d3.selectAll("input[name='geo']").on("change", function() { update(); });

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this);

    // find where the en dash occurs in the date range so we can split the date range into two parts [m/d-, m/d]
    var hyphenLocation = text.text().indexOf("–");

    var words = text.text(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy"));

        // put each part in its own tspan element to the tick label to wrap nicely onto 2 lines
        text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em").text(words.substr(0, hyphenLocation + 1));
        text.append("tspan").attr("x", 0).attr("y", y).attr("dy", lineHeight + dy + "em").text(words.substr(hyphenLocation + 1, words.length))
  });
}
