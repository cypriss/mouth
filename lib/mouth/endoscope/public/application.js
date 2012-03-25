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
  
  // Assume all sources are of the same kind here
  setSources: function(sources) {
    var kind = (sources[0] && sources[0].kind) || "counter"
    ,   sourceStrings = _.map(sources, function(r) { return r.source; })
    ;
    
    this.set({kind: kind, sources: sourceStrings});
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
    _.bindAll(this, 'render', 'onCurrentChange', 'onClickAddGraph', 'onAddGraph');
    
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
  
  onClickAddGraph: function(evt) {
    var self = this;
    evt && evt.preventDefault();
    
    if (this.model) {
      sourceListInst.show({
        callback: function(sources) {
          var item = new Graph();
          item.setSources(sources);
          self.model.autoPlaceGraph(item);
          item.save();
        }
      });
    }
  }
});

var graphSequence = 0;
var GraphView = Backbone.View.extend({
  tagName: 'li',
  
  events: {
    'click .edit': 'onClickEdit',
    'click .delete': 'onClickDelete',
    'click .pick': 'onClickPick'
  },
  
  initialize: function(opts) {
    _.bindAll(this, 'render', 'onDragStop', 'onClickEdit', 'onClickPick', 'onCreateModel', 'onClickDelete', 'onRemoveModel', 'onPick');
    
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
    ;
    
    if (this.mode === 'front') {
      this.renderFront(el);
    } else {
      this.renderBack(el, m);
    }
    
    var graphBody = el.find('.graph-body, .graph-back')
    ,   graphHeader = el.find('.graph-header span')
    
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
    }
    
    return this;
  },
  
  renderFront: function(el) {
    var template = '<div class="graph-inner"><div class="graph-header"><span></span> <a href="#" class="edit">Edit</a></div><div class="graph-body" id="' + this.graphId + '"></div></div>';
    el.html(template);
  },
  
  renderBack: function(el, m) {
    var html
    ,   sources = m.get('sources')
    ,   domUl
    ,   domItem
    ;
    
    html = [
      '<div class="graph-inner">',
        '<div class="graph-header">',
          '<span></span> <a href="#" class="edit">See Graph</a>',
        '</div>',
        '<div class="graph-back">',
          '<a href="#" class="delete">Delete</a>',
          '<div class="kind">' + m.get('kind') + '</div>',
          '<ul></ul>',
          '<div><a href="#" class="pick">Pick Sources</a></div>',
        '</div>',
      '</div>'
    ];
    el.html(html.join(''));
    
    domUl = el.find('ul');
    
    _.each(sources, function(s) {
      html = [
        '<li>',
          '<span class="source-item">' + s + '</span>',
        '</li>'
      ];
      
      domItem = $(html.join(''));
      domUl.append(domItem);
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
      this.mode = 'back';
    } else {
      this.mode = 'front';
    }
    
    this.render();
  },
  
  onCreateModel: function() {
    this.updateData();
  },
  
  onClickPick: function(evt) {
    var sources = this.model.get('sources')
    ,   kind = this.model.get('kind')
    ,   sourceObjs = _.map(sources, function(s) { return {kind: kind, source: s}; })
    ;
    
    sourceListInst.show({callback: this.onPick, sources: sourceObjs});
  },
  
  onPick: function(sources) {
    this.model.setSources(sources);
    this.model.save();
    this.mode = 'front';
    this.render();
  },
  
  onClickDelete: function(evt) {
    evt && evt.preventDefault();
    this.model.destroy();
  },
  
  onRemoveModel: function() {
    $(this.el).remove();
  }
});

var sourceListInst;
var SourceList = Backbone.View.extend({
  tagName: 'div',
  className: "source-list",
  
  
  events: {
    'click .cancel': 'onClickCancel',
    'click .ok': 'onClickOk',
    'click input:checkbox': 'onCheck'
  },
  
  initialize: function(opts) {
    _.bindAll(this, 'render', 'show', 'fetch', 'onClickOk', 'onClickCancel', 'onCheck');
    
    // Items are objects like this: {"source":"auth.inline_logged_in","kind":"counter"}
    this.items = [];
    this.callback = function() {};
    this.fetch();
    
    $(document.body).append(this.render().hide().el);
  },
  
  render: function() {
    var el = $(this.el)
    ,   html
    ;
    
    html = [
      '<div class="head">',
        '<h2>Choose multiple counters or one timer:</h2>',
        // '<input type="text" class="idea" />',
        '<a href="#" class="cancel">X</a>',
      '</div>',
      '<ul>',
      '</ul>',
      '<div class="foot">',
        '<button class="ok">Ok</button>',
      '</div>'
    ];
    
    el.html(html.join(''));
    
    var list = el.find('ul');
    
    //
    // Construct the DOM of each list item
    //
    _.each(this.items, function(item) {
      html = [
        '<li class="source-item">',
          '<label>',
            '<input type="checkbox" class="' + item.kind + '" />',
            '<span class="source-name">' + item.kind + ": " + item.source + '</span>',
          '</label>',
        '</li>'
      ];
      var domItem = $(html.join(''));
      domItem.find('input').val(JSON.stringify(item)).data('source', item);
      list.append(domItem);
    });
    
    if (this.items.length == 0) {
      list.append('<li class="no-data source-item">No data detected recently</li>');
    }
    
    return this;
  },
  
  show: function(opts) {
    opts = opts || {};
    
    var dir = opts.direction || 'right'
    ,   el = $(this.el)
    ;
    
    if (opts.callback) {
      this.callback = opts.callback;
    }
    
    this.render();
    el.removeClass('right left').addClass(dir);
    el.css({height: _.min([_.max([200,  100 + this.items.length * 26]), $(window).height()])});
    
    if (opts.sources) {
      var checkboxes = el.find('input:checkbox')
      ,   sources = opts.sources
      ;
      
      _.each(checkboxes, function(e) {
        var source = $(e).data('source');
        if (source) {
          var any = _.any(sources, function(s) { return s && source && (s.kind == source.kind) && (s.source == source.source); });
          if (any) {
            $(e).prop('checked', true);
          }
        }
      });
    }
    
    el.show();
  },
  
  hide: function() {
    $(this.el).hide();
    return this;
  },
  
  onClickOk: function() {
    var el = $(this.el)
    ,   selected = el.find('input:checked')
    ,   vals = _.map(selected, function(item) { return JSON.parse($(item).val()); })
    ;
    
    this.callback(vals);
    this.hide();
  },
  
  onClickCancel: function() {
    return this.hide();
  },
  
  onCheck: function(evt) {
    var el = $(this.el)
    ,   target = $(evt.target)
    ,   targetChecked = target.prop('checked')
    ,   source = JSON.parse(target.val());
    ;
    
    if (targetChecked) {
      // If you check a timer, everything else is unchecked
      if (source.kind === 'timer') {
        el.find('input:checkbox').prop('checked', false);
        target.prop('checked', true);
      }
      
      // If you check a counter, all timers are unchecked
      if (source.kind === 'counter') {
        el.find('input:checkbox.timer').prop('checked', false);
      }
    }
    
  },
  
  fetch: function() {
    var self = this;
    
    $.getJSON('/sources', {}, function(data) {
      self.items = data;
    });
  }
});

$(function() {
  var dblv = new DashboardListView({el: $('#dashboards')});
  var dbpane = new DashboardPane({el: $('#current-dashboard'), dashboardListView: dblv});
  
  sourceListInst = new SourceList();
});

}(jQuery));