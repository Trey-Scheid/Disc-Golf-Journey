// set the dimensions and margins of the graph
const timemargin = {top:60, left: 60, right:10, bottom:60},
timewidth = 600-timemargin.right-timemargin.left,
timeheight = 450-timemargin.top-timemargin.bottom,
timepadding = 0;



// PLOT 1 - Courses Over Time
// create svg and margin convention
let timesvg1 = d3.select("#time-chart1")
  .append("svg")
      .attr("width",timewidth+timemargin.right+timemargin.left)
      .attr("height",timeheight+timemargin.top+timemargin.bottom)
  .append("g")
      .attr("transform","translate("+timemargin.left+","+timemargin.top+")");

// create a tooltip //div with text to move around
const timeTooltip = d3.select("#time-chart1")
  .append("div")
    .attr("id", "time1label")
    .style("opacity", 0)
    .attr("pointer-events", "none")

// line on the svg to move to start date
const timeTooltipLine = timesvg1.append("line")
  .attr("id", "time1line")
  .attr("x1", 0)
  .attr("y1", 30)
  .attr("x2", 0)
  .attr("y2", timeheight)
  .attr("stroke", "var(--selectwhite)")
  .attr("stroke-width", 2)
  .attr("opacity", 0)
  .attr("pointer-events", "none")

//date for the line to display
const timeTooltipLineLabel = timesvg1.append("text")
  .attr("id", "time1linelabel")
  .attr("x", 0)
  .attr("y", 0)
  .style("fill", "var(--selectwhite)")
  .attr("opacity", 0)
  .attr("pointer-events", "none")

const udiscTimeConverter = function(d) {
  return {
    // CourseName: d.CourseName,
    Date: d3.timeParse("%Y-%m-%d %H%M")(d.Date),
    PlayerName: d.PlayerName,
    // Hole1: +d.Hole1,
    // Hole10: +d.Hole10,
    // Hole20: +d.Hole20,  
    // score: +d["+/-"],
    // LayoutName: d.LayoutName,
    CoursesPlayed: +d.CoursesPlayed
  }
};


d3.csv("timepreprocessed.csv", udiscTimeConverter).then(function(data){
    
  const sumstat = d3.group(data, d => d.Date);
  //area per person
  const players = new Set(data.map(d => d.PlayerName));
  players.delete("Par")
  const keys = [...players];

  const numbersk = [...d3.range(0, keys.length, 1)]
  const stackkeys = [...keys.map((k, i) => `${numbersk[i]}:${k}`)]

  //Stack the data
  let stacked  = d3.stack()
    .offset(d3.stackOffNone)
    .order(d3.stackOrderDescending) //Appearance InsideOut Descending
    .keys(stackkeys)
    .value(function(d, key){
        return d[1][+key.split(":")[0]].CoursesPlayed
      })
    (sumstat);


  //define scaling
  let xtimeScale1 = d3.scaleTime()
    .domain(d3.extent(data, d => d.Date))
    .range([ timepadding, timewidth - timepadding]);

  let maxValue = d3.max(stacked, (d) => d3.max(d, (d) => d[1]));
  let minValue = d3.min(stacked, (d) => d3.min(d, (d) => d[1]));

  let ytimeScale1 = d3.scaleLinear()
    .domain([minValue, maxValue]) //d3.min(data, d => Math.min(0, d.Sales, d.Profit))
    .range([ timeheight, 0 ]);


  //color by area/key
  let time1colors = d3.scaleOrdinal()
    .domain(stackkeys)
    .range(["#bbde93","#8fd49a","#61c9a5","#2dbbb0","#00acb9","#009bbd","#0089ba","#3c76af","#4c82b6","#5b8fbd","#6b9bc4","#7ba8cc","#8cb4d3","#9dc1da","#aecde1"]);


  //highlight interactivity

  function fancyreducer(grouparr) {
    for (let i = 0; i < grouparr.length; i++) {
      if (grouparr[i].CoursesPlayed == 1) {
        firstdate = grouparr[i].Date
        break;
      }
   }
    return (firstdate)
  }
  // find first date per person
  firstdates = d3.rollup(data, g => fancyreducer(g), y => y.PlayerName);

  // What to do when one group is hovered
  const highlight = function(event,d){
    // reduce opacity of all groups
    d3.selectAll(".myArea").style("opacity", .35)
    // expect the one that is hovered
    d3.select(this).style("opacity", 1)

    //show name on hover
    tipperson = d3.select(this).attr("class").split("Area ")[1]
    timeTooltip.html(tipperson);
    timeTooltip.style("opacity", 1);

    console.log(time1colors(tipperson));
    //date on line
    timeTooltipLineLabel.transition()
      .attr("opacity", 1)
      .attr("x", xtimeScale1(firstdates.get(tipperson)))
      .attr("y", 20)
      .style("fill", time1colors(tipperson))
      .text(`${d3.timeFormat("%x")(firstdates.get(tipperson))}`)

    

    //move svg line
    timeTooltipLine
      .transition()
      .attr("opacity", 1)
      .attr("x1", xtimeScale1(firstdates.get(tipperson)))
      .attr("y1", 30)
      .attr("x2", xtimeScale1(firstdates.get(tipperson)))
      .attr("y2", timeheight)
  }

  const time1mousemove = (event, d) => {
    //move tooltip to appropriate location
    const x = event.pageX - 60;
    const y = event.pageY - 40;
    
    timeTooltip
      .style("left", x + "px")
      .style("top", y + "px")
  };

  // And when it is not hovered anymore
  const noHighlight = function(event,d){
    d3.selectAll(".myArea").style("opacity", 1)
    
    //hide + sink tooltip
    timeTooltip.style("opacity", 0);
    timeTooltip.style("z-index", -1); //so text doesn't block hover over other bubbles

    timeTooltipLine.transition().attr("opacity", 0)
    timeTooltipLineLabel.transition()
      .attr("opacity", 0)
  }

  
  let time1area = d3.area()
    .x(function(d, i) { return xtimeScale1(d.data[0]); })
    .y0(function(d) { return ytimeScale1(d[0]); })
    .y1(function(d) { return ytimeScale1(d[1]); });

  timesvg1.selectAll(".mylayers")
    .data(stacked)
    .join("path")
      .attr("class", function(d) {return "myArea " + d.key.split(":")[1] })
      .style("fill", function(d) {return time1colors(d.key.split(":")[1]); })
      .attr("d", time1area)
      .on("mouseover", highlight)
      .on("mousemove", time1mousemove)
      .on("mouseleave", noHighlight)

  timeTooltipLine.raise();
  timeTooltipLineLabel.raise();

  //add axes on top of areas
  timesvg1.append("g")
    .call(d3.axisLeft(ytimeScale1));

  timesvg1.append("g")
    .attr("transform", "translate(0," + timeheight + ")")
    .call(d3.axisBottom(xtimeScale1))

});

// Main Title
timesvg1.append("text")
  .attr("id", "timetitle")
  .attr("transform", `translate(${timewidth / 2},${- timemargin.top / 2})`)
  .attr("font-weight", 300)
  .text("Courses over Time");

// Xaxis title
timesvg1.append("text")
  .attr("class", "timeaxis")
  .attr("transform", `translate(${timewidth / 2},${timeheight + timemargin.bottom * 3/4})`)
  // .attr("font-weight", 300)
  .text("Date");
//Yaxis title
timesvg1.append("text")
  .attr("class", "timeaxis")
  // .attr("font-weight", 300)
  .attr("transform", `translate(${- timemargin.left * 3/4},${timeheight / 2}) rotate(-90)`)
  .text("Total Courses Played");




const interest = ["Trey Scheid", "Todd Scheid", "Shane Johnson", "James ", "Jeffrey"];


// PLOT 3 - Matrix Scores over Time
const timemargin3 = {top:30, left: 50, right:0, bottom:30};

const udiscTimeConverter3 = function(d) {
  return {
    // CourseName: d.CourseName,
    Date: d3.timeParse("%Y-%m-%d %H%M")(d.Date),
    PlayerName: d.PlayerName,
    // Hole1: +d.Hole1,
    // Hole10: +d.Hole10,
    // Hole20: +d.Hole20,  
    score: +d["+/-"],
    // LayoutName: d.LayoutName,
    // CoursesPlayed: +d.CoursesPlayed
  }
};

d3.csv("UDiscScorecards.csv", udiscTimeConverter3).then(function(data){
    data = data.filter(d => interest.includes(d.PlayerName));

  // group the data: I want to draw one line per group
  const sumstat = d3.group(data, d => d.PlayerName) // nest function allows to group the calculation per level of a factor

  // What is the list of groups?
  allKeys = new Set(data.map(d=>d.PlayerName))

  // Add an svg element for each group. The will be one beside each other and will go on the next row when no more room available
  const timesvg3 = d3.select("#time-chart3")
    .selectAll("uniqueChart")
    .data(sumstat)
    .enter()
    .append("svg")
      .attr("width", timewidth/3 + timemargin3.left + timemargin3.right)
      .attr("height", timeheight/3 + timemargin3.top + timemargin3.bottom)
    .append("g")
      .attr("class", "canvases")
      .attr("transform",
            `translate(${timemargin3.left},${timemargin3.top})`);

  // Add X axis
  const xtimeScale3 = d3.scaleTime()
    .domain(d3.extent(data, d=> d.Date))
    .range([ 0, timewidth/3 ]);
  timesvg3
    .append("g")
    .attr("transform", `translate(0, ${timeheight/3})`)
    .call(d3.axisBottom(xtimeScale3).ticks(4));

  //Add Y axis
  const ytimeScale3 = d3.scaleLinear()
    .domain(d3.extent(data, function(d) { return 1.3 * d.score; }))
    .range([ timeheight/3, 0 ]);
  timesvg3.append("g")
    .call(d3.axisLeft(ytimeScale3).ticks(5));

  // color palette
  const colortimeScale3 = d3.scaleOrdinal()
    .domain(allKeys)
    .range(["#bbde93", "#00b4b5", "#3c76af", "#73a1c8", "#aecde1"])
    // .range(d3.schemeSet2)
    // .range(['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999999'])

  d3.selectAll("#time-chart3 .canvases")
    .selectAll(".backgroundpaths")
    .data(sumstat)
    .enter()
    .append("path")
      .attr("class", "backgroundpaths")
      .attr("fill", "none")
      .attr("stroke", "gray")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("opacity", .5)
      .attr("stroke-width", .3)
      .attr("d", function(d){
        return d3.line()
          .x(function(d) { return xtimeScale3(d.Date); })
          .y(function(d) { return ytimeScale3(d.score); })
          (d[1])
      })

  // Draw the line
  timesvg3
    .append("path")
      .attr("fill", "none")
      .attr("stroke", function(d) {return colortimeScale3(d[0]) })
      .attr("stroke-width", 1)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", function(d){
        return d3.line()
          .x(function(d) { return xtimeScale3(d.Date); })
          .y(function(d) { return ytimeScale3(d.score); })
          (d[1])
      })

  // y=0 par axis
  timesvg3.append('line')
    .style("stroke", "var(--selectwhite)")
    .style("opacity", .25)
    .style("stroke-dasharray", "5 5")
    .style("stroke-width", 1)
    .attr("x1", 0)
    .attr("y1", ytimeScale3(0))
    .attr("x2", timewidth/3)
    .attr("y2", ytimeScale3(0));

  //Yaxis title
  timesvg3
    .append("text")
    .attr("class", "timeaxis")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${0},${timeheight/3 + 15})`)//rotate(-90) - timemargin.left * 1/2
    // .attr("y", -6)
    // .attr("x", 7)
    .text("Score +/-")
    // .style("fill", function(d){ return colortimeScale3(d[0]) })

  // // Xaxis title
  // timesvg3.append("text")
  //   .attr("class", "timeaxis")
  //   .attr("transform", `translate(${timewidth/3 / 2},${timeheight/3 + timemargin.bottom * 2/3})`)
  //   .text("Date");

  
  



  // Add titles
  timesvg3
    .append("text")
    .attr("text-anchor", "start")
    .attr("y", -6)
    .attr("x", 7)
    .text(function(d){ return(d[0])})
    .style("fill", function(d){ return colortimeScale3(d[0]) })
})








// PLOT 4 - grouped bar for score and time of day

// create svg and margin convention
let timesvg4 = d3.select("#time-chart4")
  .append("svg")
    .attr("width",timewidth+timemargin.right+timemargin.left)
    .attr("height",timeheight+timemargin.top+timemargin.bottom)
  .append("g")
    .attr("transform","translate("+timemargin.left+","+timemargin.top+")");


const udiscTimeConverter4 = function(d) {
  date = d3.timeParse("%Y-%m-%d %H%M")(d.Date);
  date = d3.timeParse("%H%M")(d3.timeFormat("%H%M")(date));
  return {
    // CourseName: d.CourseName,
    Date: date < d3.timeParse("%H%M")("1030") 
    ? "Morning":  date < d3.timeParse("%H%M")("1500")
    ? "Midday" : "Afternoon",
    MYear:d3.timeParse("%Y-%m-%d %H%M")(d.Date),
    // Date: (date < d3.timeParse("%H%M")("1100")) ? "Morning" : ((date < d3.timeParse("%H%M")("1500")) ? "Midday" : "Afternoon"),
    PlayerName: d.PlayerName,
    // Hole1: +d.Hole1,
    // Hole10: +d.Hole10,
    // Hole20: +d.Hole20,
    score: +d["+/-"],
    // Total: +d.Total,
    // LayoutName: d.LayoutName,
    // CoursesPlayed: +d.CoursesPlayed
    }
};

d3.csv("UdiscScorecards.csv", udiscTimeConverter4).then(function(data){
  // data = data.filter(d => d.PlayerName != "Par")
  data = data.filter(d => (interest.includes(d.PlayerName) && d.MYear > d3.timeParse("%x")("6/1/2020")));

  const groupData = d3.rollup(data, m => d3.mean(m, x => x.score), d => d.PlayerName, f => f.Date);

  // console.log(groupData.sort(function(a, b) {console.log(a, b); return b}));
  //area per person
  const players = new Set(data.map(d => d.PlayerName));
  const keys = [...players];

  keys.sort((a, b) => d3.mean(Array.from(groupData.get(b).values())) - d3.mean(Array.from(groupData.get(a).values())));
  //bars per person
  const subgroups = ["Morning", "Midday", "Afternoon"];

  // X Scale people/groups
  const xtimeScale4 = d3.scaleBand()
    .domain(keys)
    .range([0, timewidth])
    .padding([0.2])

  // Y Scale
  const ytimeScale4 = d3.scaleLinear()
    .domain([0, 1.2 * d3.max(groupData, g => Math.max(...Array.from(g[1].values())))])
    .range([ timeheight, 0 ]);

  // X Scale for subgroup position within group
  const xSubgroup = d3.scaleBand()
    .domain(subgroups)
    .range([0, xtimeScale4.bandwidth()])
    .padding([0.07])

  // color palette = one color per subgroup
  const colortime4 = d3.scaleOrdinal()
    .domain(subgroups)
    .range(d3.schemePaired)

  // draw bars
  timesvg4.append("g")
    .selectAll("g")
    .data(groupData)
    .join("g") //per person
      .attr("transform", function(d) {return `translate(${xtimeScale4(d[0])}, 0)`})
    .selectAll("rect")
    .data(function(d) {return subgroups.map(function(key) { return {key: key, value: d[1].get(key)}; }); })
    .join("rect") //per subgroup item
      .attr("x", function(d) {return xSubgroup(d.key)}) 
      .attr("y", d => ytimeScale4(d.value))
      .attr("width", xSubgroup.bandwidth())
      .attr("height", d => timeheight - ytimeScale4(d.value))
      .attr("fill", d => colortime4(d.key));

  // show axes
  timesvg4.append("g")
    .attr("transform", `translate(0, ${timeheight})`)
    .call(d3.axisBottom(xtimeScale4).tickSize(0));
  timesvg4.append("g")
    .call(d3.axisLeft(ytimeScale4));

  // LEGEND
  // Add one dot in the legend for each name.
  timesvg4.selectAll("mydots")
    .data(subgroups)
    .enter()
    .append("circle")
      .attr("cx", 12/15 * timewidth)
      .attr("cy", (d,i) => 0.1 * timeheight + i*20) // height by proportion and item i
      .attr("r", 4)
      .style("fill", d => colortime4(d));

  // Add text legend for each name.
  timesvg4.selectAll("mylabels")
    .data(subgroups)
    .enter()
    .append("text")
      .attr("x", 12/15 * timewidth + 10)
      .attr("y", (d,i) => 0.1 * timeheight + i*20) // height by proportion and item i
      .text(d => d)
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")
      .attr("font-weight", 425)
      .attr("font-size", 14);
});

// Main Title
timesvg4.append("text")
  .attr("id", "timetitle")
  .attr("transform", `translate(${timewidth / 2},${- timemargin.top / 2})`)
  .text("When To Minimize Score");

// Xaxis title
timesvg4.append("text")
  .attr("class", "timeaxis")
  .attr("transform", `translate(${timewidth / 2},${timeheight + timemargin.bottom * 2/3})`)
  .text("Player");
//Yaxis title
timesvg4.append("text")
  .attr("class", "timeaxis")
  .attr("transform", `translate(${- timemargin.left * 1/2},${timeheight / 2}) rotate(-90)`)
  .text("Average Score +/-");
