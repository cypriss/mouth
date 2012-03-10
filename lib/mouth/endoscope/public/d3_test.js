(function($, window) {

// onready:
$(function() {
  console.log("Ready");
  
  var seven = new Seven('#graph', {start: 1325404800000, step: 'minute', points: 13});
  seven.graph({name: 'Hello there', data: [10, 3, 2, 0, 5, 2, 1, 3, 8, 5, 3, 9, 0]});
  seven.graph({name: 'poop', data: [10, 3, 2, 0, 5, 2, 1, 3, 8, 5, 3, 9, 0].reverse()});
  //seven.graph({name: 'timings', timings: [{average: 10, stddev: 2, count: 9, min: 3, max: 15}, ...]});
  
  //seven.timeWindow({start: 1327863409241}).graph()
  
  
  
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
