const geowidth = 600;
const geoheight = 400;

const geosvg = d3
  .select("#map-container")
  .append("svg")
    .attr("width", geowidth)
    .attr("height", geoheight)
  .append("g")

const geolegend = d3
  .select("#map-container")
  .select("svg")
  .append("g")
    .attr("class", "geolegend")

  /* ----------------------- map section ----------------------- */
let projection = d3
  .geoMercator()
  .scale(2800)
  .center([-119, 35.5])
  .translate([geowidth/2, geoheight/2]);

let geoGenerator = d3.geoPath().projection(projection);

//draw geography
function drawMap(geojson) {
  geosvg.selectAll("path")
    .data(geojson.features)
    .enter()
    .append("path")
      .attr("d", geoGenerator)
      .attr("stroke", "var(--selectwhite)")
      .attr("stroke-width", 1)
      .attr("fill", "none")
}

// REQUEST MAP DATA and draw
d3.json("us-states-6.json").then(function (json) {
  drawMap(json);
});

/* ------------------------ course data section ------------------------- */
let chosen_player = "Trey Scheid";
// let first_load = true;

// create a tooltip
let Tooltip = d3.select("#map-container")
  .append("div")
    .attr("id", "course-name")
    .style("opacity", 0)
    .attr("pointer-events", "none")

//for import course locations
const geoConverter = function(d) {
  return {
      CourseName: d.CourseName,
      LL: d["Lattitude, Longitude"].split(", ").map(x => +x).sort((a, b) => a - b),
      // Longitude: +d["Lattitude, Longitude"].split(", ")[1],
      // Address: d.Address,
  }
}
// for import scorecards
const udiscConverter = function(d) {
  return {
      CourseName: d.CourseName,
      PlayerName: d.PlayerName,
      Hole1: +d.Hole1,
      Hole10: +d.Hole10,
      Hole20: +d.Hole20,  
      score: +d["+/-"],
      // Date: d3.timeParse("%Y-%m-%d %H%M")(d.Date),
      // LayoutName: d.LayoutName,
      // Total: +d.Total
  }
};

// join tables on CourseName (used in create_data())
const reducer = function (a, b) {
  if (a[0] === b.CourseName) {
    b["value"] = a[1];
    return b
  }
  else {return 0}
}
const reducer2 = function (a, b) {
  if (a[0] === b.CourseName) {
    b["avg"] = a[1];
    return b
  }
  else {return 0}
}

// merge + format data (based on chosen player!)
function create_data(scores, csv, scorecards) {

  //groupby course get count (if Total Players selected then sum players)
  if (chosen_player != "Total Players Scored") {
    rolled = d3.rollup(scores, v => v.length, g => g.CourseName, l => l.PlayerName);
  }
  else {rolled = d3.rollup(scores, v => v.length, g => g.CourseName);}
  //join tables
  let combined = d3.cross(rolled, csv, reducer).filter(d => d != 0);
  //keep only chosen_player data
  if (chosen_player != "Total Players Scored") {
    combined.forEach(function(a) {
      found = a.value.get(chosen_player)
      if (found) {a.value = found}
      else {a.value = 0}
      // console.log(a);
    })

    combined = combined.filter(d => d.value != 0);
  }
    //groupby course get mean score (if Total Players selected then sum players)
    if (chosen_player != "Total Players Scored") {
      rolled2 = d3.rollup(scorecards, k => d3.mean(k, d2 => d2.score), g2 => g2.CourseName, l2 => l2.PlayerName);
    }
    else {rolled2 = d3.rollup(scorecards, k => d3.mean(k, d2 => d2.score), g2 => g2.CourseName);}
    //join tables
    let combined2 = d3.cross(rolled2, csv, reducer2).filter(d => d != 0);
    //keep only chosen_player data
    if (chosen_player != "Total Players Scored") {
      combined2.forEach(function(a2) {
        found2 = a2.avg.get(chosen_player)
        if (found2) {a2.avg = found2}
        else {a2.avg = 0}
      })
      combined2 = combined2.filter(d2 => d2.avg != 0);
    }

    
  return combined
}

//create circles from grouped + formatted data
function addBubbles(combined) {
  geosvg.selectAll(".bubbles")
    .data(combined)
    .join("circle")
      .attr("class", "bubbles")
      .attr("r", d => areaScale(d.value))
      .attr("cx", d => projection(d.LL)[0])
      .attr("cy", d => projection(d.LL)[1])
      .on("mouseover", handleMouseover)
      .on("mousemove", mousemove) //Tooltip follow mouse
      .on("mouseout", handleMouseout);
}


// REQUEST SCORECARD DATA
d3.csv("UDiscScorecards.csv", udiscConverter).then( function (scorecards) {
  d3.csv("Courses.csv", geoConverter).then(function (csv) {

    tworounds = scorecards.filter(d => d.Hole10 > 0);
    threerounds = scorecards.filter(d => d.Hole20 > 0);
    let new_scorecards = scorecards.concat(tworounds, threerounds);

    //opt groups
    overall = d3.select("#select-player").append("optgroup").attr("label", "overall")
    individuals = d3.select("#select-player").append("optgroup").attr("label", "individuals")

    //Add grouped options
    overall.selectAll(".option")
    .data(["Total Players Scored", "Par"])
    .enter()
    .append("option")
      .attr("class", "option")
      .attr("value", d => d) //keeps Par
      .text(function(d) {
        if (d === "Par") {return "Each Scorecard"}
        else {return d}
      })
    
    //player names
    players = new Set(scorecards.map(d => d.PlayerName));
    players.delete("Par");
    players = [...players].sort();

    //add player options
    individuals.selectAll(".option")
      .data(players)
      .enter()
      .append("option")
        .attr("class", "option")
        .attr("value", d => d)
        .text(d => d)

    // set default selection to "Trey Scheid"
    document.getElementById("select-player").value = chosen_player;
    
    //format data
    combined = create_data(new_scorecards, csv, scorecards);

    areaScale = d3.scaleSqrt()
      .domain(d3.extent(combined, d => d.value))
      .range([1, 7]);

    //add bubbles for Trey Scheid
    addBubbles(combined);
    
    d3.select("#map-container svg").call(geozoom);
  });//close data1
});//close data2
  

//on chosen_player change re-render
function run_it() {
  //get new chosen_player
  chosen_player = document.getElementById("select-player").value;
  // REQUEST SCORECARD DATA
  d3.csv("UDiscScorecards.csv", udiscConverter).then( function (scorecards) {
    d3.csv("Courses.csv", geoConverter).then(function (csv) {

      tworounds = scorecards.filter(d => d.Hole10 > 0);
      threerounds = scorecards.filter(d => d.Hole20 > 0);

      combined = create_data(scorecards.concat(tworounds, threerounds), csv, scorecards);

      areaScale = d3.scaleSqrt()
        .domain(d3.extent(combined, d => d.value))
        .range([1, 7]);

      addBubbles(combined);
    });//close data1
  });//close data2
} //end run it


const tooloffsetx = 15;
const tooloffsety = 15;
const f = .5 //factor for zoom translate extent
//zoom object
const geozoom = d3.zoom()
  .scaleExtent([.5, 17]) // Set the minimum and maximum zoom levels
  .translateExtent([[-f*geowidth, -f*geoheight], [(1+f) * geowidth, (1+f)*geoheight]])
  .on("zoom", function (event) {
    geosvg.attr("transform", event.transform);
    geolegend.attr("transform", event.transform);//"transform", `translate(${-cx*(event.transform.k-1)}), ${-cy*(event.transform.k-1)}) scale(${event.transform.k})`);
  });

function handleMouseover(e, d) {
  //highlight bubble
  d3.select(this)
    .attr("class", null)
    .attr("fill", "var(--highlightgreen)")
    .attr("opacity", .9)
    .raise();

  //show tooltip and change text
  Tooltip.html(d.CourseName + "<br>Rounds: " + d.value + "<br>Avg Score: " + d.avg.toFixed(2));
  Tooltip.style("opacity", 1);
}

const mousemove = (event, d) => {
  //move tooltip to appropriate location
  const x = event.pageX + tooloffsetx;
  const y = event.pageY + tooloffsety;
  
  Tooltip
    .style("left", x + "px")
    .style("top", y + "px")
};

function handleMouseout(e, d) {
  //reset bubble style, leave raised
  d3.select(this)
    .attr("class", "bubbles")

  //hide + sink tooltip
  Tooltip.style("opacity", 0);
  Tooltip.style("z-index", -1); //so text doesn't block hover over other bubbles
}

function netzoomIn() {
  d3.select("#map-container svg")
    .transition()
    .call(geozoom.scaleBy, 3);
}

function netzoomOut() {
  d3.select("#map-container svg")
    .transition()
    .call(geozoom.scaleBy, 0.75);
}

function netresetZoom() {
  d3.select("#map-container svg")
    .transition()
    .call(geozoom.scaleTo, 1);
}

function netcenter() {
  d3.select("#map-container svg")
    .transition()
    .call(geozoom.translateTo, geowidth / 2, geoheight / 2);
}

// function netpanLeft() {
//   d3.select("#map-container svg")
//     .transition()
//     .call(geozoom.translateBy, -50, 0);
// }

// function netpanRight() {
//   d3.select("#map-container svg")
//     .transition()
//     .call(geozoom.translateBy, 50, 0);
// }