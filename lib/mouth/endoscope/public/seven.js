(function($, window) {

// Throttles the calling of the callback function by delay milliseconds
function throttle(callback, delay) {
  var lasttime = 0;

  return function() {
    var elapsed = +new Date() - lasttime
    ,   args    = arguments
    ,   self    = this;

    if (elapsed > delay) {
      lasttime = +new Date();
      callback.apply(self, args);
    }
  }
};

function dateFor(startDate, granularityInMinutes, dataPoints) {
  return new Date(+startDate + (granularityInMinutes * 60000 * (dataPoints - 1)));
}

var colors = d3.scale.ordinal().range("#007AD1 #469623 #EDDC00 #EB6D0E #BA0211 #572382 #029186 #9EA81D #F2A500 #E04107 #911258 #2144C7".split(' '));

window.Seven = function(selector, opts) {
  this.selector = selector;
  this.element = $(selector);
  this.dataSets = {};
  this.startDate = new Date(opts.start);
  this.granularityInMinutes = opts.granularityInMinutes;
  this.points = opts.points;
  this.endDate = dateFor(this.startDate, this.granularityInMinutes, this.points);
  this.kind = opts.kind || 'counter';
  this.dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
}

Seven.prototype = {
  
  graph: function(opts) {
    var self = this
    ,   name = opts.name || "default"
    ;
    
    // Save our data.  Counters are named and there can be many.  Timers take up the whole graph.
    this.dataSets[name] = {data: opts.data};
    if (this.kind == 'timer') {
      this.timingData = opts.data;
    }
    
    // Empty out the graph.
    // NOTE: improvement opportunity
    this.element.empty();
    
    this.graphWidth = this.element.width();
    this.graphHeight = this.element.height();
    
    var elD3 = d3.select(this.selector);
    
    // Calculate max value in slightly different ways for counter vs timer
    var maxValue = null;
    if (this.kind == 'counter') {
      var allData = [];
      _.each(this.dataSets, function(v, k) {
        _.each(v.data, function(d) {
          allData.push(d);
        })
      });
      maxValue = d3.max(allData);
    } else if (this.kind == 'timer') {
      var allData = [];
      _.each(this.timingData, function(d) {
        if (d.mean !== null) {
          allData.push(d.mean + d.stddev);
        }
      })
      maxValue = d3.max(allData);
    }
    
    // Calculate scales
    this.xScale = d3.time.scale().domain([this.startDate, this.endDate]).range([7, this.graphWidth - 12]);
    this.xScaleIndex = d3.time.scale().domain([this.startDate, this.endDate]).range([0, this.points - 1]);
    this.yScale = d3.scale.linear().domain([0, maxValue]).range([7, this.graphHeight - 7]);
    
    // Add in our svg element
    var svg = elD3
      .append('svg:svg')
      .attr('class', 'seven ' + this.kind)
      .attr("width", this.graphWidth)
      .attr("height", this.graphHeight);
    
    // Create a translating group
    var svgGroup = svg.append("svg:g")
        .attr("transform", "translate(" + 0 + "," + this.graphHeight + ")");
    
    if (this.kind == 'counter') {
      // Add the paths
      var i = 0;
      _.each(this.dataSets, function(datasetObj, datasetName) {
        var datasetValues = datasetObj.data;
        datasetObj.color = colors(i);
        
        var line = d3.svg.line()
            //.interpolate("basis")
            .x(function(d, i) { return self.xScale(dateFor(self.startDate, self.granularityInMinutes, i + 1)); })
            .y(function(d) { return -1 * self.yScale(d); });

        var path = svgGroup.append("svg:path").attr("d", line(datasetValues))
            .attr('stroke', datasetObj.color)
            .attr('stroke-width', 1);

        i += 1;
      });
    } else if (this.kind == 'timer') {
      this.barWidth = (this.graphWidth - 19) / this.points;
      this.barScale = d3.scale.linear().domain([0, 1]).range([0, this.barWidth]);
      
      svgGroup.selectAll('rect.stddev')
          .data(this.timingData)
        .enter().append("rect")
          .attr('class', function(d, i) { return d.mean !== null ? 'stddev' : 'novalue'; })
          .attr("x", function(d, i) { return self.barScale(i) + 6.5; })
          .attr("y", function(d) { return -self.yScale(d.mean + d.stddev) - .5; })
          .attr("width", this.barWidth)
          .attr("height", function(d) { return self.yScale(d.stddev * 2); })
          .attr('fill', colors(0));

       svgGroup.selectAll('rect.mean')
           .data(this.timingData)
         .enter().append("rect")
           .attr('class', function(d, i) { return d.mean !== null ? 'mean' : 'novalue'; })
           .attr("x", function(d, i) { return self.barScale(i) + 6.5; })
           .attr("y", function(d) { return -self.yScale(d.mean) + 2; })
           .attr("width", this.barWidth)
           .attr("height", function(d) { return 2; })
           .attr('fill', 'white');
    }
    
    //  Draw axis
    svgGroup.append("svg:line") // x-axis
        .attr("x1", this.xScale(this.startDate) - 2)
        .attr("y1", -1 * this.yScale(0) + 2.5)
        .attr("x2", this.xScale(this.endDate))
        .attr("y2", -1 * this.yScale(0) + 2.5)
        .attr('stroke', '#AAA').attr('stroke-width', 1);
    
    svgGroup.append("svg:line") // y-axis
        .attr("x1", this.xScale(this.startDate) - 2.5)
        .attr("y1", -1 * this.yScale(0) + 2)
        .attr("x2", this.xScale(this.startDate) - 2.5)
        .attr("y2", -1 * this.graphHeight - 7)
        .attr('stroke', '#AAA').attr('stroke-width', 1);
    
    // Handle the tool tip
    this.element.bind('mousemove', throttle(function(e) {
      var offset = self.element.offset()
      ,   cx = e.pageX - offset.left
      ,   cy = e.pageY - offset.top
      ;
      
      self.showTip({
        x: cx,
        y: cy
      });
    }, 50));
    
    this.element.bind('mouseleave', function(e) {
      self.hideTip();
    });
    
    return this;
  },
  
  showTip: function(opts) {
    var self = this
    ,   html
    ,   date = this.xScale.invert(opts.x)
    ,   index = Math.round(this.xScaleIndex(date))
    ,   nearestDate = this.xScaleIndex.invert(index)
    ,   leftAnchor = this.xScale(nearestDate)
    ,   tipRows = self.kind == 'counter' ? _.size(this.dataSets) : 7
    ,   tipWidth
    ,   tipHeight
    ,   tipLeft
    ,   tipTop
    ;
    
    if (index < 0 || index >= this.points) {
      this.hideTip();
      return;
    }
    
    // Timers have a slightly different 'center' to align to the scrubber
    if (this.kind == 'timer') {
      leftAnchor = (index + 0.5) * this.barWidth + 6;
    }
    
    // Build the tip if it doesn't exist
    if (!this.tip) {
      html = [
        '<div class="seven-tip">',
          '<div class="seven-tip-inner">',
            '<div class="seven-tip-time"></div>',
            '<ul class="seven-tip-values"></ul>',
          '</div>',
        '</div>'
      ];
      
      this.tip = $(html.join(''));
      this.element.append(this.tip);
      this.tipSide = 'right';
    }
    
    this.tip.find('.seven-tip-time').text(this.dateFormat(nearestDate));
    
    this.tip.css({display: 'block'});
    
    tipWidth = this.tip.width();
    tipHeight = this.tip.height();
    if (this.tipSide == 'right' && ((leftAnchor + 25 + tipWidth) >= this.graphWidth)) {
      this.tipSide = 'left';
    } else if (this.tipSide == 'left' && ((leftAnchor - 25 - tipWidth) <= 0)) {
      this.tipSide = 'right';
    }
    
    if (this.tipSide == 'right') {
      tipLeft = leftAnchor + 20;
    } else {
      tipLeft = leftAnchor - 20 - tipWidth;
    }
    
    tipTop = opts.y - 10;
    if ((tipTop + tipHeight + 10) > this.graphHeight) {
      tipTop = this.graphHeight - tipHeight - 10;
    }
    
    if (tipTop < 0) {
      tipTop = 5;
    }
    
    this.tip.css({
      top: tipTop,
      left: tipLeft
    });
    
    html = [];
    _.each(this.dataSets, function(datasetObj, datasetName) {
      var datasetValues = datasetObj.data
      
      if (self.kind == 'counter') {
        var n = datasetValues[index];
        if (n !== null) n = Math.round(n * 100) / 100;
        html.push([
          '<li>',
            '<span class="key"><span class="color" style="background-color:' + datasetObj.color + '"></span>' + datasetName + ': </span>',
            '<span class="value">' + n + '</span>',
          '</li>'
        ].join(''));
      } else if (self.kind == 'timer') {
        var t = datasetValues[index]
        ,   fields = ['count', 'mean', 'median', 'stddev', 'min', 'max', 'sum']
        ;
        
        _.each(fields, function(f) {
          var n = t[f];
          if (n !== null) n = Math.round(n * 100) / 100;
          html.push('<li><span class="key">' + f + ': </span><span class="value">' + n + '</span></li>');
        });
      }
    });
    this.tip.find('.seven-tip-values').html(html.join(''));
    
    if (!this.scrubber) {
      html = '<div class="seven-scrubber"></div>'
      this.scrubber = $(html);
      this.element.append(this.scrubber);
    }
    this.scrubber.css({display: 'block', left: leftAnchor, height: this.graphHeight - 14});
  },
  
  hideTip: function() {
    if (this.tip) {
      this.tip.css({display: 'none'});
    }
    if (this.scrubber) {
      this.scrubber.css({display: 'none'});
    }
  }
  
};
  
}(jQuery, this));
