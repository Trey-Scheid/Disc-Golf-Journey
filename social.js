// set the dimensions and margins of the graph
const socialmargin = {top: 60, right: 10, bottom: 10, left: 10},
network_width = 600 - socialmargin.left - socialmargin.right,
network_height = 400 - socialmargin.top - socialmargin.bottom
network_zoom_controls = false;

// append svg to div container
const network_svg = d3.select("#network-container")
  .append("svg")
    .attr("width", network_width + socialmargin.left + socialmargin.right)
    .attr("height", network_height + socialmargin.top + socialmargin.bottom)
  .append("g")
    .attr("transform",`translate(${socialmargin.left}, ${socialmargin.top})`);

//initialize d3.zoom object
const network_zoom = d3.zoom()
   .scaleExtent([.5, 5]) // Set the minimum and maximum levels
   .translateExtent([[-network_width, -network_height], [2*network_width, 2*network_height]])
   .on("zoom", function (event) {
    network_svg.attr("transform", event.transform);
});

//apply it
d3.select("#network-container svg").call(network_zoom);

//button functions
function linear() {
  network_zoom_controls = !network_zoom_controls
  render(network_zoom_controls);
  d3.select("#Thickness").text(network_zoom_controls ? "Thickness: Linear": "Thickness: Logarithmic")
}

function zoomIn() {
	d3.select("#network-container svg")
		.transition()
		.call(network_zoom.scaleBy, 1.5);
}

function zoomOut() {
	d3.select("#network-container svg")
		.transition()
		.call(network_zoom.scaleBy, 0.8);
}

function resetZoom() {
	d3.select("#network-container svg")
		.transition()
		.call(network_zoom.scaleTo, 1);
}

function center() {
	d3.select("#network-container svg")
		.transition()
		.call(network_zoom.translateTo, 0.5 * network_width, 0.5 * network_height);
}

// function panLeft() {
// 	d3.select("#network-container svg")
// 		.transition()
// 		.call(network_zoom.translateBy, -50, 0);
// }

// function panRight() {
// 	d3.select("#network-container svg")
// 		.transition()
// 		.call(network_zoom.translateBy, 50, 0);
// }

//add defs to svg for filters etc
let defs = d3.select("#network-container svg").append("defs")

//shadow filter will be used for mouseover interactivity of circles
defs.append("filter")
    .attr("id", "blur")
    .attr("x", "-100%")
    .attr("y", "-100%")
    .attr("width", "400%")
    .attr("height", "400%")
  .append("feDropShadow")
    .attr("stdDeviation", 8)


function render(network_zoom_controls) {
// clear graph
d3.select("#network-container svg g").html(null);
//REQUEST DATA
d3.json("nodelink.json").then(function(data) {

  const d3scale = network_zoom_controls ? d3.scaleLinear() : d3.scaleLog();
  //line width by d.value
  const linkScale = d3scale
    .domain(d3.extent(data.links, d => d.value))
    .range([.25, 4])

  // Initialize the links
  const link = network_svg.selectAll("line")
    .data(data.links)
    .join("line")
      .style("stroke", "#aaa")
      .attr("stroke-width", d => linkScale(d.value));

  // Initialize the nodes
  const node = network_svg.selectAll("circle")
    .data(data.nodes)
    .join("g")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);

  //node circles
  circles = node.append("circle")
      .attr("r", 8)
      .attr("fill", d => d.PlayerName === "Trey Scheid" ? "rgb(246, 246, 246)": "var(--selectorange)")

  //node labels
  texts = node.append("text")
      .attr("class", "node-label") //see CSS
      .attr("fill", "var(--selectwhite)") //when this is in CSS i can't override later
      .attr("dy", -11) //above
      .text(function(d) {return d.PlayerName});

  //force simulation link pull strength by d.value
  const weightScale = d3.scalePow()
    .exponent(.19)
    .domain(d3.extent(data.links, function (d) { return d.value }))
    .range([.25, 1])

  // iteration of the force algorithm, updating the positions
  function ticked() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
  }

  // create forces
  const simulation = d3.forceSimulation(data.nodes) // .nodes = data.nodes
      // attraction between nodes
      .force("link", d3.forceLink()
        .id(function(d) { return d.PlayerName; }) // the id of a node
        .links(data.links)
        .distance(90) //minimum apart
        .strength(function(d) {return weightScale(d.value)}) //force together
      )
      // repulsion between nodes
      .force("charge", d3.forceManyBody() //repulsion between nodes
        .strength(-1000))
      .on("tick", ticked);//"end" if no animation desired

  //Fix myself in the center and the other group to the left side
  simulation.nodes().forEach(function(d) {
    if (d.PlayerName === "Trey Scheid") {
      d.fx = network_width / 2;
      d.fy = network_height / 2;
    }
    else if (d.PlayerName === "Keith Farmer + Jeffrey") {
      d.fx = -network_width / 2;
      d.fy = network_height / 2 - 45;
    }
    else if (d.PlayerName === "James  + Rob Park") {
      d.fx = -network_width / 2 - 20;
      d.fy = network_height / 2 + 70;
    }
    else if (d.PlayerName === "Trey Scheid + Todd Scheid") {
      d.fx = -network_width / 2 - 35;
      d.fy = network_height / 2;
    }
  });

  // interactivity, only show links for mouseover node
  function mouseover(evt, d) {
    //show only connected links
    link
      .transition()
      .attr("display", "none")
      .filter((l) => l.source.index === d.index || l.target.index === d.index)
      .attr("display", "block");
    
    //node effects
    the = d3.select(this)
    the.raise();  
    the.select("circle").transition().attr("filter", "url(#blur)"); //shodow
    the.select("text").transition().attr("fill", "white"); //brighten text
  };

  function mouseout(evt) {
    //show all links
    link.transition().attr("display", "block");

    //remove filter and return text color
    d3.select(this).select("circle").transition().attr("filter", "none");
    d3.select(this).select(".node-label").transition().attr("fill", "var(--selectwhite)");
  };
});
}
render();