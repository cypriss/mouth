(function($) {

// Some simple logging  
var $log = function() { console.log.apply(console, arguments); };

//
// Models
//
var Dashboard = Backbone.Model.extend({
  defaults: {
    width: 100,
    height: 100
  },
  
  initialize: function(attrs) {
    _.bindAll(this, 'onAddGraph');
    $log("Dashboard.initialize ", attrs);
    var graphs = this.graphs = new GraphList();
    _.each(attrs.graphs || [], function(g) {
      graphs.add(g);
    });
    graphs.bind('add', this.onAddGraph);
  },
  
  // When a graph is added, fill in the association
  onAddGraph: function(m) {
    m.set({dashboard_id: this.get('id')});
  },
  
  // Intelligently place the graph on the dashboard. For now, just put it at the bottom left.
  autoPlaceGraph: function(g) {
    var pos = {left: 0, top: 0, width: 20, height: 7};
    
    var bottoms = [];
    this.graphs.each(function(gi) {
      var gpos = gi.get('position');
      bottoms.push((gpos.top || 0) + (gpos.height || 0));
    });
    bottoms.sort();
    var bottomest = bottoms[bottoms.length - 1] || 0;
    pos.top = bottomest;
    g.set({position: pos});
    
    this.graphs.add(g);
  }
});

var Graph = Backbone.Model.extend({
  defaults: {
    'window': 240,
    'granularity': 'minute'    
  },
  
  initialize: function(attrs) {
    $log("Graph.initialize ", attrs);
  },
  
  name: function() {
    var s = this.get('series') || []
    ,   s0 = s[0];
    
    if (s0) {
      var source = s0["source"];
      return source["kind"] + ": " + source["collection"] + "." + source["key"];
    }
    return "No data defined yet."
  },
  
  setLocation: function(top, left) {
    var pos = this.get('position');
    pos.top = top;
    pos.left = left;
    this.set({position: pos});
  },
  
  setSource: function(source) {
    var s = this.get('series') || []
    ,   s0 = s[0];
    
    if (s0) {
      s0["source"] = source;
      this.set({series: s});
    } else {
      s = [{}];
      s0 = s[0];
      if (source.kind === "timer") {
        s0.kind = 'candle';
      } else {
        s0.kind = 'line';
      }
      s0.color = 'blue';
      s0.source = source;
      this.set({series: s});
    }
  }
});

//
// Collections
//
var DashboardList = Backbone.Collection.extend({
  model: Dashboard,
  url: '/dashboards'
});

var GraphList = Backbone.Collection.extend({
  model: Graph,
  url: '/graphs'
});

//
// Views
//
var DashboardItemView = Backbone.View.extend({
  tagName: 'li',
  className: 'dashboard_item',
  
  events: {
    'blur input': 'onBlurName',
    'click .delete': 'onClickDelete'
  },
  
  initialize: function() {
    _.bindAll(this, 'render', 'onChangeModel', 'onRemoveModel', 'onBlurName', 'onClickDelete');
    this.model.bind('change', this.onChangeModel);
    this.model.bind('remove', this.onRemoveModel);
  },
  
  render: function() {
    var name = this.model.get('name');
    $(this.el).html('<span class="chooser">' + name + '</span><input type="text" value="' + name + '" /> <a href="#" class="delete">X</a>');
    $(this.el).data('view', this);
    return this;
  },
  
  
  onChangeModel: function() {
    $log("DashboardItemView.onChangeModel");
    this.render();
  },
  
  onRemoveModel: function() {
    $(this.el).remove();
  },
  
  onBlurName: function() {
    $log("DashboardItemView.onBlurName value=", this.$('input').val());

    var newName = this.$('input').val();
    
    if (!newName.trim()) {
      this.render();
    } else {
      this.model.set({'name': newName});
      this.model.save();
    }
  },
  
  onClickDelete: function(evt) {
    $log("DashboardItemView.onClickDelete");
    evt && evt.preventDefault();
    this.model.destroy();
  }
});

var DashboardListView = Backbone.View.extend({
  
  events: {
    'click .add-dashboard': 'onClickAddDashboard',
    'click .chooser': 'onClickChooser'
  },
  
  initialize: function() {
    $log("DashboardListView.initialize");
    
    _.bindAll(this, 'onClickAddDashboard', 'onAddDashboard', 'onResetDashboards', 'onClickChooser');
    
    this.collection = new DashboardList();
    this.collection.bind('add', this.onAddDashboard);
    this.collection.bind('reset', this.onResetDashboards);
    this.collection.fetch();
  },
  
  render: function() {
    
  },
  
  onClickAddDashboard: function(evt) {
    $log("DashboardListView.onClickAddDashboard");
    
    evt && evt.preventDefault();
    
    var item = new Dashboard();
    item.set({name: "New Dashboard"});
    this.collection.add(item);
  },
  
  onClickChooser: function(evt) {
    $log("DashboardListView.onClickChooser");
    
    evt && evt.preventDefault();
    
    var target = $(evt.target).parent('.dashboard_item');
    var view = target.data('view');
    this.trigger('current_change', view.model);
  },
  
  onAddDashboard: function(m) {
    $log("DashboardListView.onAddDashboard");
    var dbItemView = new DashboardItemView({model: m});
    this.$('ul').append(dbItemView.render().el);
  },
  
  onResetDashboards: function(col) {
    $log("DashboardListView.onResetDashboards, ", this.el);
    var self = this, firstModel = null;
    col.each(function(m) {
      firstModel = firstModel || m;
      self.onAddDashboard(m);
    });
    this.trigger('current_change', firstModel);
  }
});

var DashboardPane = Backbone.View.extend({
  
  events: {
    'click .add-graph': 'onClickAddGraph'
  },
  
  initialize: function(opts) {
    $log("DashboardPane.initialize ", opts);
    
    _.bindAll(this, 'render', 'onCurrentChange', 'onClickAddGraph', 'onAddGraph');
    
    this.dashboardList = opts.dashboardListView;
    this.dashboardList.bind('current_change', this.onCurrentChange);
    
    this.model = null;
    
    this.elTitle = this.$('h2');
    this.elGrid= this.$('#grid');
    this.elAddGraph = this.$('.add-graph');
    
    this.render();
  },
  
  render: function() {
    this.elTitle.text((this.model && this.model.get('name')) || "(none)");
    
    return this;
  },
  
  onCurrentChange: function(model) {
    $log("DashboardPane.onCurrentChange: ", model);
    var self = this;
    
    // Clean up
    if (self.model) {
      self.model.graphs.unbind('add', self.onAddGraph);
      self.elGrid.empty();
    }
    
    self.model = model;
    model.graphs.each(function(m) {
      self.onAddGraph(m);
    })
    self.render();
    model.graphs.bind('add', self.onAddGraph);
  },
  
  onAddGraph: function(m) {
    $log("DashboardPane.onAddGraph: ", m);
    var graphView = new GraphView({model: m});
    this.elGrid.append(graphView.render().el);
  },
  
  onClickAddGraph: function(evt) {
    $log("DashboardPane.onClickAddGraph");
    
    evt && evt.preventDefault();
    if (this.model) {
      var item = new Graph();
      this.model.autoPlaceGraph(item);
    }
  }
});

var GraphView = Backbone.View.extend({
  tagName: 'li',
  
  events: {
    'click .edit': 'onClickEdit',
    'click .delete': 'onClickDelete',
    'change .data-source': 'onChangeSource'
  },
  
  initialize: function(opts) {
    $log("GraphView.initialize");
    _.bindAll(this, 'render', 'onDragStop', 'onClickEdit', 'onChangeSource', 'onCreateModel', 'onClickDelete', 'onRemoveModel');
    this.mode = 'front';
    this.model = opts.model;
    this.model.bind('change:id', this.onCreateModel);
    this.model.bind('remove', this.onRemoveModel);
  },
  
  // TODO: quite a bit of duplication here, refactor this shizzle.
  render: function() {
    
    if (this.mode === 'front') {
      return this.renderFront();
    } else {
      return this.renderBack();
    }
  },
  
  renderFront: function() {
    var el = $(this.el)
    ,   m = this.model
    ;
    
    el.html('<div class="graph-header"><span></span> <a href="#" class="edit">Edit</a></div><div class="graph-body"></div>');
    
    var graphBody = el.find('.graph-body')
    ,   graphHeader = el.find('.graph-header span')
    ;

    el.css('top', m.get('position').top * 30 + 'px');
    el.css('left', m.get('position').left * 30 + 'px');
    el.css('width', m.get('position').width * 30 + 'px');
    el.css('height', m.get('position').height * 30 + 'px');
    el.css('background-color', '#FEF');
    
    // NOTE: probably need to re-do this to set absolute dimensions so shart can work
    graphBody.css({top: '20px', position: 'absolute', left: 0, right: 0, bottom: 0, 'background-color': '#FFF'});
    
    graphHeader.text(m.name());
    
    el.draggable({grid: [30,30], containment: 'parent', cursor: 'move', stop: this.onDragStop, handle: '.graph-header'});
    el.css('position', 'absolute'); // NOTE: draggable applies position: relative, which seems completely retarded.
    
    this.updateData();
    
    return this;
  },
  
  renderBack: function() {
    var el = $(this.el)
    ,   m = this.model
    ;
    
    el.html('<div class="graph-header"><span></span> <a href="#" class="edit">Edit</a></div><div class="graph-back"><select class="data-source"></select> <a href="#" class="delete">Delete</a></div>');
    
    var graphBack = el.find('.graph-back')
    ,   graphHeader = el.find('.graph-header span')
    ;

    el.css('top', m.get('position').top * 30 + 'px');
    el.css('left', m.get('position').left * 30 + 'px');
    el.css('width', m.get('position').width * 30 + 'px');
    el.css('height', m.get('position').height * 30 + 'px');
    el.css('background-color', '#FEF');
    
    // NOTE: probably need to re-do this to set absolute dimensions so shart can work
    graphBack.css({top: '20px', position: 'absolute', left: 0, right: 0, bottom: 0});
    
    graphHeader.text(m.name());
    
    el.draggable({grid: [30,30], containment: 'parent', cursor: 'move', stop: this.onDragStop, handle: '.graph-header'});
    el.css('position', 'absolute'); // NOTE: draggable applies position: relative, which seems completely retarded.
    
    this.loadStreams();
    
    return this;
  },
  
  onDragStop: function(evt, ui) {
    $log("GraphView.onDragStop: ", evt, ui);
    
    var pos = $(this.el).position();
    
    this.model.setLocation(parseInt(pos.top / 30, 10), parseInt(pos.left / 30, 10));
    this.model.save();
  },
  
  onClickEdit: function(evt) {
    $log('GraphView.onClickEdit');
    
    evt && evt.preventDefault();
    
    // POOP:
    if (this.mode === 'front') {
      this.mode = "back";
    } else {
      this.mode = "front";
    }
    
    this.render();
  },
  
  onCreateModel: function() {
    $log("GraphView.onCreateModel");
    this.updateData();
  },
  
  onChangeSource: function(evt) {
    $log('GraphView.onChangeSource');
    
    var combo = $(evt.target);
    var source = JSON.parse(combo.val());
    
    this.model.setSource(source);
    this.model.save();
  },
  
  onClickDelete: function(evt) {
    $log('GraphView.onClickDelete');
    
    evt && evt.preventDefault();
    this.model.destroy();
  },
  
  // Remove self
  onRemoveModel: function() {
    $log('GraphView.onRemoveModel');
    $(this.el).remove();
  },
  
  loadStreams: function() {
    
    // This shit sucks, it's kinda slow.  I'd much rather have this stored somewhere when the page loads, and have that periodically refresh.
    var self = this;
    $.getJSON('/streams', {}, function(data) {
      
      // data is an array of things like this: {"collection":"mouth_auth","kind":"counter","key":"inline_logged_in"}
      var options = _.map(data, function(s) {
        var label = s.kind + ": " + s.collection + "." + s.key;
        return $("<option>").text(label).attr('value', JSON.stringify(s));
      });
      
      var ds = self.$('.data-source').empty().append($('<option value="" disabled selected>Pick a data source</option>'));
      _.each(options, function(o) {
        ds.append(o);
      })
      
      
    });
  },
  
  updateData: function() {
    var self = this;
    if (self.model.isNew()) {
      // TODO: maybe render a no data thinger
      return;
    }
    $.getJSON('/graphs/' + self.model.get('id') + '/data', {poop: 1}, function(data) {
      
      // Mark: take some candlestick data and shart it into a shart.
      
      var sequences = [];
      var series = self.model.get('series');
      _.each(series, function(s, i) {
        sequences.push({
          type: s.kind,
          label: s.source.key,
          sequence: data[i]
        });
      });
      self.$('.graph-body').html(JSON.stringify(sequences));
      
      // Shart.Series(self.$('.graph-body'), sequences,
      //              {
      //                startTime: "Tue, 18 Oct 2011 23:59:59 -0700",
      //                endTime: "Fri, 28 Oct 2011 23:59:59 -0700",
      //                dateAxis: 'daily',
      //              });
    });
  }
});

$(function() {
  $log("document.ready");
  
  var dblv = new DashboardListView({el: $('#dashboards')});
  var dbpane = new DashboardPane({el: $('#current_dashboard'), dashboardListView: dblv});
  

});

}(jQuery));