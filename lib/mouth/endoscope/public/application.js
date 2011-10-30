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
    var self = this;
    col.each(function(m) {
      self.onAddDashboard(m);
    });
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
    
  },
  
  initialize: function() {
    $log("GraphView.initialize");
    _.bindAll(this, 'render', 'onDragStop');
  },
  
  render: function() {
    //$(this.el).html(JSON.stringify(this.model.toJSON()));
    
    var e = $(this.el);
    var m = this.model;

    e.css('top', m.get('position').top);
    e.css('left', m.get('position').left);
    e.css('width', m.get('position').width * 10 + 'px');
    e.css('height', m.get('position').height * 10 + 'px');
    e.css('background-color', '#FEF');
    
    e.draggable({grid: [30,30], containment: 'parent', cursor: 'move', stop: this.onDragStop});
    this.updateData();
    
    return this;
  },
  
  onDragStop: function(evt, ui) {
    $log("GraphView.onDragStop: ", evt, ui);
    
    var e = $(this.el);
    var pos = e.position();
    $log(pos.left, pos.top);
  },
  
  updateData: function() {
    var self = this;
    $.getJSON('/graphs/' + this.model.get('id') + '/data', {poop: 1}, function(data) {
      $log("pooppp: ", data);
      
      var sequences = [];
      var series = self.model.get('series');
      _.each(series, function(s, i) {
        sequences.push({
          type: s.kind,
          label: s.source.key,
          sequence: data[i]
        });
      });
      
      Shart.Series($(self.el), sequences,
                   {
                     startTime: "Tue, 18 Oct 2011 23:59:59 -0700",
                     endTime: "Fri, 28 Oct 2011 23:59:59 -0700",
                     dateAxis: 'daily',
                   });
    });
  }
});

$(function() {
  $log("document.ready");
  
  var dblv = new DashboardListView({el: $('#dashboards')});
  var dbpane = new DashboardPane({el: $('#current_dashboard'), dashboardListView: dblv});
  

});

}(jQuery));