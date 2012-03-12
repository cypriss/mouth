(function($, window) {

// onready:
$(function() {
  console.log("Ready");
  
  var seven = new Seven('#graph', {start: 1325404800000, step: 'minute', points: 120, kind: 'timer'});
  // seven.graph({name: 'Hello there', data: [10, 3, 2, 0, 5, 2, 1, 3, 8, 5, 3, 9, 0]});
  // seven.graph({name: 'poop', data: [10, 3, 2, 0, 5, 2, 1, 3, 8, 5, 3, 9, 0].reverse()});
  //seven.graph({name: 'timings', timings: [{average: 10, stddev: 2, count: 9, min: 3, max: 15}, ...]});
  
  //seven.timeWindow({start: 1327863409241}).graph()
  
  var tdata = [{"count":8,"min":3,"max":99,"mean":44,"sum":352,"median":47,"stddev":1},{"count":0,"min":null,"max":null,"mean":null,"sum":0,"median":null,"stddev":null},{"count":15,"min":19,"max":81,"mean":40,"sum":600,"median":44,"stddev":5},{"count":10,"min":6,"max":81,"mean":59,"sum":590,"median":63,"stddev":8},{"count":19,"min":8,"max":92,"mean":41,"sum":779,"median":41,"stddev":4},{"count":20,"min":4,"max":84,"mean":47,"sum":940,"median":49,"stddev":3},{"count":8,"min":9,"max":89,"mean":57,"sum":456,"median":61,"stddev":7},{"count":9,"min":10,"max":98,"mean":57,"sum":513,"median":59,"stddev":1},{"count":14,"min":3,"max":82,"mean":42,"sum":588,"median":44,"stddev":6},{"count":16,"min":19,"max":99,"mean":49,"sum":784,"median":52,"stddev":7},{"count":15,"min":1,"max":84,"mean":49,"sum":735,"median":49,"stddev":0},{"count":13,"min":10,"max":96,"mean":52,"sum":676,"median":54,"stddev":0},{"count":1,"min":15,"max":96,"mean":59,"sum":59,"median":60,"stddev":1},{"count":16,"min":3,"max":81,"mean":45,"sum":720,"median":46,"stddev":2},{"count":8,"min":0,"max":81,"mean":55,"sum":440,"median":56,"stddev":9},{"count":20,"min":18,"max":94,"mean":53,"sum":1060,"median":57,"stddev":8},{"count":8,"min":16,"max":88,"mean":44,"sum":352,"median":48,"stddev":1},{"count":17,"min":8,"max":81,"mean":53,"sum":901,"median":55,"stddev":8},{"count":11,"min":18,"max":82,"mean":56,"sum":616,"median":57,"stddev":3},{"count":3,"min":12,"max":87,"mean":59,"sum":177,"median":61,"stddev":6}];
  
  
  seven.graph({name: 'Timer Test Set', data: tdata.concat(tdata).concat(tdata).concat(tdata).concat(tdata).concat(tdata)});
  
  
  //setTimeout(function() { seven.graph({name: 'shit', data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5]}); }, 1000);
});


$(function() {
  // console.log("Ready");
  // 
  // var data = [3, 6, 2, 7, 5, 2, 1, 3, 8, 9, 2, 5, 7],
  //     w = 1000,
  //     h = 400,
  //     margin = 20,
  //     y = d3.scale.linear().domain([0, d3.max(data)]).range([0 + margin, h - margin]),
  //     x = d3.scale.linear().domain([0, data.length]).range([0 + margin, w - margin]);
  // 
  // console.log(d3.select('#graph'))
  // 
  // var vis = d3.select("#graph")
  //     .append("svg:svg")
  //     .attr("width", w + "px")
  //     .attr("height", h + "px");
  // console.log(vis)
  // var g = vis.append("svg:g")
  //     .attr("transform", "translate(0, 400)");
  //     
  // var line = d3.svg.line()
  //     .x(function(d,i) { return x(i); })
  //     .y(function(d) { return -1 * y(d); });
  //     
  //     
  // g.append("svg:path").attr("d", line(data));
  // 
  
  // g.append("svg:line")
  //     .attr("x1", x(0))
  //     .attr("y1", -1 * y(0))
  //     .attr("x2", x(w))
  //     .attr("y2", -1 * y(0));
  // 
  // g.append("svg:line")
  //     .attr("x1", x(0))
  //     .attr("y1", -1 * y(0))
  //     .attr("x2", x(0))
  //     .attr("y2", -1 * y(d3.max(data)));
          
              
              
  // g.selectAll(".xLabel")
  //     .data(x.ticks(5))
  //     .enter().append("svg:text")
  //     .attr("class", "xLabel")
  //     .text(String)
  //     .attr("x", function(d) { return x(d) })
  //     .attr("y", 0)
  //     .attr("text-anchor", "middle");
  // 
  // g.selectAll(".yLabel")
  //     .data(y.ticks(4))
  //     .enter().append("svg:text")
  //     .attr("class", "yLabel")
  //     .text(String)
  //     .attr("x", 0)
  //     .attr("y", function(d) { return -1 * y(d) })
  //     .attr("text-anchor", "right")
  //     .attr("dy", 4);
      
                  
  // g.selectAll(".xTicks")
  //     .data(x.ticks(5))
  //     .enter().append("svg:line")
  //     .attr("class", "xTicks")
  //     .attr("x1", function(d) { return x(d); })
  //     .attr("y1", -1 * y(0))
  //     .attr("x2", function(d) { return x(d); })
  //     .attr("y2", -1 * y(-0.3));
  // 
  // g.selectAll(".yTicks")
  //     .data(y.ticks(4))
  //     .enter().append("svg:line")
  //     .attr("class", "yTicks")
  //     .attr("y1", function(d) { return -1 * y(d); })
  //     .attr("x1", x(-0.3))
  //     .attr("y2", function(d) { return -1 * y(d); })
  //     .attr("x2", x(0));
});
  
}(jQuery, this));
