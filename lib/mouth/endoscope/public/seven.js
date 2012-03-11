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

// Calculates startDate + interval * (dataPoints - 1),
// where interval is one of {second, minute, hour, day}
function dateFor(startDate, interval, dataPoints) {
  var multiple;
  
  if (interval === 'second') {
    multiple = 1000;
  } else if (interval === 'minute') {
    multiple = 60000;
  } else if (interval === 'hour') {
    multiple = 60 * 60 * 1000;
  } else if (interval === 'day') {
    multiple = 24 * 60 * 60 * 1000;
  }

  return new Date(+startDate + (multiple * (dataPoints - 1)));
}

var colors = d3.scale.ordinal().range("#007AD1 #469623 #EDDC00 #EB6D0E #BA0211 #572382 #029186 #9EA81D #F2A500 #E04107 #911258 #2144C7".split(' '));

window.Seven = function(selector, opts) {
  this.selector = selector;
  this.element = $(selector);
  this.dataSets = {};
  this.startDate = new Date(opts.start);
  this.step = opts.step;
  this.points = opts.points;
  this.endDate = dateFor(this.startDate, this.step, this.points);
  this.kind = opts.kind || 'counter';
  this.dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
}

Seven.prototype = {
  
  graph: function(opts) {
    var self = this
    ,   name = opts.name || "default"
    ;
    
    this.dataSets[name] = opts.data;
    
    this.element.empty();
    
    var elD3 = d3.select(this.selector);
    var allData = [];
    _.each(this.dataSets, function(v, k) {
      _.each(v, function(d) {
        allData.push(d);
      })
    });
    var maxValue = d3.max(allData)
        
    this.graphWidth = this.element.width();
    this.graphHeight = this.element.height();
    
    this.xScale = d3.time.scale().domain([this.startDate, this.endDate]).range([7, this.graphWidth - 12]);
    this.xScaleIndex = d3.time.scale().domain([this.startDate, this.endDate]).range([0, this.points - 1]);
    this.yScale = d3.scale.linear().domain([d3.min(allData.concat([0])), maxValue]).range([7, this.graphHeight - 7]);
    
    var svg = elD3
      .append('svg:svg')
      .attr('class', 'seven')
      .attr("width", this.graphWidth)
      .attr("height", this.graphHeight);
      
    var svgGroup = svg.append("svg:g")
        .attr("transform", "translate(" + 0 + "," + this.graphHeight + ")");
    
    
    // Add the paths
    var i = 0;
    _.each(this.dataSets, function(datasetValues, datasetName) {
      var line = d3.svg.line()
          //.interpolate("basis")
          .x(function(d, i) { return self.xScale(dateFor(self.startDate, self.step, i + 1)); })
          .y(function(d) { return -1 * self.yScale(d); });

      var path = svgGroup.append("svg:path").attr("d", line(datasetValues))
          .attr('stroke', colors(i))
          .attr('stroke-width', 1);
      
      i += 1;
    });
    
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
    ;
    
    if (index < 0) {
      this.hideTip();
      return;
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
    }
    
    this.tip.find('.seven-tip-time').text(this.dateFormat(nearestDate));
    
    this.tip.css({display: 'block'});
    this.tip.css({
      top: opts.y - 10,
      left: this.xScale(nearestDate) + 20,
      height: '' + (_.size(this.dataSets) * 30 + 30 ) + 'px'
    });
    
    html = []
    $.each(this.dataSets, function(datasetName, datasetValues) {
      html.push([
        '<li>',
        '<span class="key">' + datasetName + ': </span>',
        '<span class="value">' + datasetValues[index] + '</span>',
        '</li>'
      ].join(''));
    });
    this.tip.find('.seven-tip-values').html(html.join(''));
    
    if (!this.scrubber) {
      html = '<div class="seven-scrubber"></div>'
      this.scrubber = $(html);
      this.element.append(this.scrubber);
    }
    this.scrubber.css({display: 'block', left: this.xScale(nearestDate), height: this.graphHeight - 14});
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
