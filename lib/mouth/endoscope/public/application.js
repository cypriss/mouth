(function($) {

// Some simple logging  
var $log = function() { console.log.apply(console, arguments); };

//
// Models
//
var Dashboard = Backbone.Model.extend({
  initialize: function(attrs) {
    _.bindAll(this, 'onAddGraph');
    
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
    var pos = {left: 0, top: 0, width: 20, height: 7}
    ,   bottoms = [];
    
    this.graphs.each(function(gi) {
      var gpos = gi.get('position');
      bottoms.push((gpos.top || 0) + (gpos.height || 0));
    });
    bottoms.sort();
    pos.top = bottoms[bottoms.length - 1] || 0;
    g.set({position: pos});
    
    this.graphs.add(g);
  }
});

var Graph = Backbone.Model.extend({
  defaults: {
    kind: 'counters'
  },
    
  name: function() {
    var s = this.get('sources') || []
    ,   s0 = s[0];
    
    if (s0) {
      return this.get('kind') + ": " + s0;
    }
    return "No data defined yet."
  },
  
  setLocation: function(position) {
    var pos = this.get('position');
    _.extend(pos, position);
    
    this.set({position: position});
  },
  
  setSource: function(kind, source) {
    this.set({kind: kind});
    this.addSource(source);
  },
  
  addSource: function(s) {
    var sources = this.get('sources');
    
    if (!sources) {
      sources = [s];
    } else {
      if (!_.include(sources, s)) {
        sources.push(s);
      }
    }
    
    this.set({sources: sources});
  },
  
  removeSource: function(source) {
    var sources = this.get('sources');
    
    if (sources) {
      sources = _.reject(sources, function(el) { return el === source; });
      this.set({sources: sources});
    }
  },
  
  matchesSource: function(source) {
    var s = this.get('sources') || []
    ,   s0 = s[0];
    
    if (s0) {
      return s0 === source.source && this.get('kind') === source.kind;
    }
    
    return false;
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
  className: 'dashboard-item',
  
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
    this.render();
  },
  
  onRemoveModel: function() {
    $(this.el).remove();
  },
  
  onBlurName: function() {
    var newName = this.$('input').val();
    
    if (!newName.trim()) {
      this.render();
    } else {
      this.model.set({'name': newName});
      this.model.save();
    }
  },
  
  onClickDelete: function(evt) {
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
    _.bindAll(this, 'onClickAddDashboard', 'onAddDashboard', 'onResetDashboards', 'onClickChooser');
    
    this.collection = new DashboardList();
    this.collection.bind('add', this.onAddDashboard);
    this.collection.bind('reset', this.onResetDashboards);
    this.collection.fetch();
  },
  
  onClickAddDashboard: function(evt) {
    evt && evt.preventDefault();
    
    this.collection.add(new Dashboard({name: "New Dashboard"}));
  },
  
  onClickChooser: function(evt) {
    evt && evt.preventDefault();
    
    var target = $(evt.target).parent('.dashboard-item')
    ,   view = target.data('view');
    
    this.trigger('current_change', view.model);
  },
  
  onAddDashboard: function(m) {
    var dbItemView = new DashboardItemView({model: m});
    this.$('ul').append(dbItemView.render().el);
  },
  
  onResetDashboards: function(col) {
    var self = this
    ,   firstModel = null;
    
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
    _.bindAll(this, 'render', 'onCurrentChange', 'onClickAddGraph', 'onAddGraph', 'onClickAddGraph2');
    
    this.dashboardList = opts.dashboardListView;
    this.dashboardList.bind('current_change', this.onCurrentChange);
    
    this.model = null;
    
    this.elGrid= this.$('#grid');
    this.elAddGraph = this.$('.add-graph');
    
    key('g', this.onClickAddGraph);
    
    this.render();
  },
  
  // render: function() {
  //   return this;
  // },
  
  onCurrentChange: function(model) {
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
    var graphView = new GraphView({model: m});
    this.elGrid.append(graphView.render().el);
  },
  
  onClickAddGraph2: function(evt) {
    evt && evt.preventDefault();
    
    
  },
  
  onClickAddGraph: function(evt) {
    evt && evt.preventDefault();
    
    if (this.model) {
      var item = new Graph();
      this.model.autoPlaceGraph(item);
    }
  }
});

var graphSequence = 0;
var GraphView = Backbone.View.extend({
  tagName: 'li',
  
  events: {
    'click .edit': 'onClickEdit',
    'click .delete': 'onClickDelete',
    'change .data-source': 'onChangeSource'
  },
  
  initialize: function(opts) {
    _.bindAll(this, 'render', 'onDragStop', 'onClickEdit', 'onChangeSource', 'onCreateModel', 'onClickDelete', 'onRemoveModel');
    
    this.mode = 'front';
    this.model = opts.model;
    this.model.bind('change:id', this.onCreateModel);
    this.model.bind('remove', this.onRemoveModel);
    this.graphId = "graph" + graphSequence++;
    this.kind = '';
  },
  
  render: function() {
    var el = $(this.el)
    ,   m = this.model
    ,   template = null
    ;
    
    template = (this.mode === 'front') ? '<div class="graph-inner"><div class="graph-header"><span></span> <a href="#" class="edit">Edit</a></div><div class="graph-body" id="' + this.graphId + '"></div></div>' :
                                         '<div class="graph-inner"><div class="graph-header"><span></span> <a href="#" class="edit">See Graph</a></div><div class="graph-back"><select class="data-source"></select> <a href="#" class="delete">Delete</a></div></div>';

    el.html(template);
    
    var graphBody = el.find('.graph-body, .graph-back')
    ,   graphHeader = el.find('.graph-header span')
    ;
    
    el.css('top', m.get('position').top * 30 + 'px');
    el.css('left', m.get('position').left * 30 + 'px');
    el.css('width', m.get('position').width * 30 + 'px');
    el.css('height', m.get('position').height * 30 + 'px');
    
    graphBody.css({top: '20px', position: 'absolute', left: 0, right: 0, bottom: 0});
    
    graphHeader.text(m.name());
    
    el.draggable({grid: [30,30], containment: 'parent', cursor: 'move', stop: this.onDragStop, handle: '.graph-header'});
    el.resizable({grid: 30, containment: 'parent', stop: this.onDragStop});
    el.css('position', 'absolute'); // NOTE: draggable applies position: relative, which seems completely retarded.
    
    if (this.mode === 'front') {
      this.updateData();
    } else {
      this.loadSources();
    }
    
    return this;
  },
  
  // This shit sucks, it's kinda slow.  I'd much rather have this stored somewhere when the page loads, and have that periodically refresh.
  loadSources: function() {
    var self = this;
    
    $.getJSON('/sources', {}, function(data) {
      
      // data is an array of things like this: {"source":"auth.inline_logged_in","kind":"counter"}
      var anySelected = false;
      var options = _.map(data, function(s) {
        var selected = self.model.matchesSource(s);
        anySelected = anySelected || selected;
        var label = s.kind + ": " + s.source;
        return $("<option" + (selected ? ' selected' : '') +  ">").text(label).attr('value', JSON.stringify(s));
      });
      
      var ds = self.$('.data-source').empty().append($('<option value="" disabled' + (anySelected ? '' : ' selected') + '>Pick a data source</option>'));
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
    $.getJSON('/graphs/' + self.model.get('id') + '/data', {}, function(data) {
      var seven = null;
      _.each(data, function(d) {
        if (!seven) {
          seven = new Seven('#' + self.graphId, {start: d.start_time * 1000, step: 'minute', points: d.data.length, kind: self.model.get('kind')});
        }
        seven.graph({name: d.source, data: d.data})
      });
    });
  },
  
  onDragStop: function(evt, ui) {
    var el  = $(this.el)
    ,   w   = el.width()
    ,   h   = el.height()
    ,   pos = el.position()
    ;
    
    this.model.setLocation({ 
      top: parseInt(pos.top / 30, 10), 
      left: parseInt(pos.left / 30, 10),
      width: parseInt(w / 30, 10),
      height: parseInt(h / 30, 10)
    });
    
    this.model.save();
    this.updateData();
  },
  
  onClickEdit: function(evt) {
    evt && evt.preventDefault();
    
    if (this.mode === 'front') {
      this.mode = "back";
    } else {
      this.mode = "front";
    }
    
    this.render();
  },
  
  onCreateModel: function() {
    this.updateData();
  },
  
  onChangeSource: function(evt) {
    var combo = $(evt.target);
    var source = JSON.parse(combo.val());
    
    this.model.setSource(source.kind, source.source);
    this.model.save();
  },
  
  onClickDelete: function(evt) {
    evt && evt.preventDefault();
    this.model.destroy();
  },
  
  onRemoveModel: function() {
    $(this.el).remove();
  }
});

$(function() {
  var dblv = new DashboardListView({el: $('#dashboards')});
  var dbpane = new DashboardPane({el: $('#current-dashboard'), dashboardListView: dblv});
});

}(jQuery));