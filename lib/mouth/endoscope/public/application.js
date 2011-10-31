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
    $log("Dashboard.initialize ", attrs);
    var graphs = this.graphs = new GraphList();
    _.each(attrs.graphs || [], function(g) {
      graphs.add(g);
    });
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
    var s = this.get('series')
    ,   s0 = s[0];
    
    if (s0) {
      var source = s0["source"];
      return source["kind"] + " " + source["collection"] + "." + source["key"];
    }
    return "No data defined yet."
  },
  
  setLocation: function(top, left) {
    var pos = this.get('position');
    pos.top = top;
    pos.left = left;
    this.set({position: pos});
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
    'blur input': 'onBlurName'
  },
  
  initialize: function() {
    _.bindAll(this, 'render', 'onChangeModel', 'onRemoveModel', 'onBlurName');
    this.model.bind('change', this.onChangeModel);
    this.model.bind('remove', this.onRemoveModel);
  },
  
  render: function() {
    var name = this.model.get('name');
    $(this.el).html('<span class="chooser">' + name + '</span><input type="text" value="' + name + '" />');
    $(this.el).data('view', this);
    return this;
  },
  
  
  onChangeModel: function() {
    $log("DashboardItemView.onChangeModel");
    this.render();
  },
  
  onRemoveModel: function() {
    this.render();
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
    
    this.dashboard = null;
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
    // TODO: unbind everything and clean up
    var self = this;
    self.model = model;
    model.graphs.each(function(m) {
      self.onAddGraph(m);
    })
    self.render();
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
      //item.set({name: "New Dashboard"});
      this.model.graphs.add(item);
    }
  }
});

var GraphView = Backbone.View.extend({
  tagName: 'li',
  
  events: {
    'click .edit': 'onClickEdit'
  },
  
  initialize: function() {
    $log("GraphView.initialize");
    _.bindAll(this, 'render', 'onDragStop', 'onClickEdit');
    this.mode = 'front';
  },
  
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
    
    el.html('<div class="graph-header"><span></span> <a href="#" class="edit">Edit</a></div><div class="graph-back"></div>');
    
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
    
    // POOOP:
    if (this.mode === 'front') {
      this.mode = "back";
    } else {
      this.mode = "front";
    }
    
    this.render();
  },
  
  updateData: function() {
    var self = this;
    $.getJSON('/graphs/' + this.model.get('id') + '/data', {poop: 1}, function(data) {
      $log("pooppp: ", data);
      
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