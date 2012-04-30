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
    ,   s0 = s[0]
    ,   len = s.length
    ;
    
    if (s0) {
      return this.get('kind') + (len > 1 ? 's' : '') + ": " + s0 + (len > 1 ? ', ...' : '');
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
    'click .delete': 'onClickDelete',
    'keydown input': 'onKeyName',
    'click button': 'onClickSave',
    'click .cancel': 'onClickCancel'
  },
  
  initialize: function(opts) {
    _.bindAll(this, 'render', 'onChangeModel', 'onRemoveModel', 'onClickDelete', 'onKeyName', 'onClickSave', 'onClickCancel', 'onChosen');
    
    this.model.bind('change', this.onChangeModel);
    this.model.bind('remove', this.onRemoveModel);
    this.model.bind('chosen', this.onChosen);
    this.mode =  opts.mode || 'show'; // vs 'edit'
  },
  
  render: function() {
    if (this.mode === 'show') {
      this.renderShow();
    } else {
      this.renderEdit();
    }
    $(this.el).data('view', this);
    return this;
  },
  
  renderShow: function() {
    var name = this.model.get('name')
    ,   html
    ;
    
    html = [
      '<span class="chooser">' + name + '</span>'
    ];
    
    $(this.el).html(html.join(''));
  },
  
  renderEdit: function() {
    var name = this.model.get('name')
    ,   el = $(this.el)
    ,   html
    ;
    
    html = [
      '<div class="dashboard-item-edit">',
        '<input type="text" value="' + name + '" /> <br />',
        '<button>Save</button> or <a href="#" class="cancel">Cancel</a>',
        '<a href="#" class="delete">Delete</a>',
      '</div>'
    ];
    
    el.html(html.join(''));
    el.find('input').select();
    
  },
  
  saveEditing: function() {
    var newName = this.$('input').val();
    
    if (newName.trim()) {
      this.mode = 'show';
      this.model.set({'name': newName});
      this.model.save();
    }
    this.render();
  },
  
  onChangeModel: function() {
    this.render();
  },
  
  onRemoveModel: function() {
    $(this.el).remove();
  },
  
  onKeyName: function(evt) {
    if (evt && evt.which === 13) {
      this.saveEditing();
    }
  },
  
  onClickSave: function(evt) {
    this.saveEditing();
  },
  
  onClickCancel: function(evt) {
    if (this.model.isNew()) {
      this.model.destroy();
    } else {
      this.mode = 'show';
      this.render();
    }
  },
  
  onClickDelete: function(evt) {
    evt && evt.preventDefault();
    this.model.destroy();
  },
  
  onChosen: function() {
    var el = $(this.el)
    ,   wasChosen = el.hasClass('selected')
    ;
    
    if (wasChosen) {
      this.mode = 'edit'
      this.render();
    } else {
      $('.dashboard-item').removeClass('selected');
      el.addClass('selected');
    }
  }
});

var DashboardListView = Backbone.View.extend({
  events: {
    'click .add-dashboard': 'onClickAddDashboard',
    'click .chooser': 'onClickChooser'
  },
  
  initialize: function() {
    _.bindAll(this, 'onClickAddDashboard', 'onAddDashboard', 'onResetDashboards', 'onClickChooser', 'onPopState');
    
    this.collection = new DashboardList();
    this.collection.bind('add', this.onAddDashboard);
    this.collection.bind('reset', this.onResetDashboards);
    this.collection.fetch();
    window.onpopstate = this.onPopState;
  },
  
  setTitle: function(model) {
    document.title = "Mouth: " + model.get("name");
  },
  
  onClickAddDashboard: function(evt) {
    evt && evt.preventDefault();
    
    this.collection.add(new Dashboard({name: "New Dashboard"}));
  },
  
  onClickChooser: function(evt) {
    var target = $(evt.target).parent('.dashboard-item')
    ,   view = target.data('view')
    ;
    
    this.trigger('current_change', view.model);
    view.model.trigger("chosen");
    window.history.pushState({dashboardId: view.model.id}, null, "/dashboards/" + view.model.id);
    this.setTitle(view.model);
  },
  
  onAddDashboard: function(m, isDynamicAdd) {
    var dbItemView = new DashboardItemView({model: m, mode: isDynamicAdd ? 'edit' : 'show'});
    this.$('ul').append(dbItemView.render().el);
    if (m.isNew()) {
      this.trigger('current_change', m);
      m.trigger('chosen');
    }
    return dbItemView;
  },
  
  onResetDashboards: function(col) {
    var self = this
    ,   currentModel = null
    ,   currentView = null
    ,   view
    ,   path = window.location.pathname
    ,   match
    ,   targetDashboardId = null
    ;
    
    match = path.match(/\/dashboards\/(.+)/);
    targetDashboardId = match && match[1];
    
    col.each(function(m) {
      currentModel = currentModel || m;
      view = self.onAddDashboard(m);
      currentView = currentView || view;
      if (targetDashboardId && m.id == targetDashboardId) {
        currentModel = m;
        currentView = view;
      }
    });
    
    this.trigger('current_change', currentModel);
    currentModel.trigger('chosen');
    window.history.replaceState({dashboardId: currentModel.id}, null, "/dashboards/" + currentModel.id);
    this.setTitle(currentModel);
  },
  
  onPopState: function(evt) {
    var self = this
    ,   dashboardId = evt && evt.state && evt.state.dashboardId
    ;
    
    if (dashboardId) {
      self.collection.each(function(m) {
        if (dashboardId == m.id) {
          self.trigger('current_change', m);
          m.trigger('chosen');
          self.setTitle(m);
        }
      });
    }
  }
});

var DashboardPane = Backbone.View.extend({
  events: {
    'click .add-graph': 'onClickAddGraph'
  },
  
  initialize: function(opts) {
    _.bindAll(this, 'render', 'onCurrentChange', 'onClickAddGraph', 'onAddGraph', 'periodicUpdate');
    
    this.dashboardList = opts.dashboardListView;
    this.dashboardList.bind('current_change', this.onCurrentChange);
    
    this.model = null;
    
    this.elGrid= this.$('#grid');
    this.elAddGraph = this.$('.add-graph');
    
    key('g', this.onClickAddGraph);
    
    this.render();
    
    setInterval(this.periodicUpdate, 60000);
  },
  
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
  },
  
  periodicUpdate: function() {
    this.model.graphs.each(function(g) {
      g.trigger("tick");
    });
  }
});

var graphSequence = 0
,   currentGraph = null;

var GraphView = Backbone.View.extend({
  tagName: 'li',
  className: 'graph',
  
  events: {
    'click .edit': 'onClickEdit',
    'click .delete': 'onClickDelete',
    'click .pick': 'onClickPick'
  },
  
  initialize: function(opts) {
    _.bindAll(this, 'render', 'onDragStop', 'onClickEdit', 'onClickPick', 'onCreateModel', 'onClickDelete', 'onRemoveModel', 'onPick', 'onCancelPick', 'onDateRangeChanged', 'onTick');
    
    this.mode = 'front';
    this.model = opts.model;
    this.model.bind('change:id', this.onCreateModel);
    this.model.bind('remove', this.onRemoveModel);
    this.model.bind('tick', this.onTick);
    this.graphId = "graph" + graphSequence++;
    this.kind = '';
    $(document.body).bind('date_range_changed', this.onDateRangeChanged);
  },
  
  render: function() {
    var el = $(this.el)
    ,   m = this.model
    ,   pos = m.get('position')
    ;
    
    // Position it
    el.css({
      top: pos.top * 30 + 'px',
      left: pos.left * 30 + 'px',
      width: pos.width * 30 + 'px',
      height: pos.height * 30 + 'px'
    });
    
    // Construct the inner div.  Only do it once
    if (!this.elInner) {
      this.elInner = $('<div class="graph-inner"></div>');
      el.append(this.elInner);
      
      el.draggable({grid: [30,30], containment: 'parent', cursor: 'move', stop: this.onDragStop, handle: '.graph-header'});
      el.resizable({grid: 30, containment: 'parent', stop: this.onDragStop});
      el.css('position', 'absolute'); // NOTE: draggable applies position: relative, which seems completely retarded.
    }
    
    // Each side is a bit different
    if (this.mode === 'front') {
      this.renderFront();
    } else {
      this.renderBack();
    }
    
    // Update the name
    el.find('.graph-header span').text(m.name());
    
    return this;
  },
  
  renderFront: function() {
    var html = [
      '<div class="graph-header">',
        '<span></span> <a href="#" class="edit">Edit</a>',
      '</div>',
      '<div class="graph-body" id="' + this.graphId + '"></div>'
    ];
    
    this.elInner.html(html.join(''));
    this.updateData();
  },
  
  renderBack: function() {
    var html
    ,   m = this.model
    ,   sources = m.get('sources')
    ,   domUl
    ,   domItem
    ;
    
    html = [
      '<div class="graph-header">',
        '<span></span> <a href="#" class="edit">See Graph</a>',
      '</div>',
      '<div class="graph-back">',
        '<div class="kind">',
          '<div class="kind-label">Kind:</div>',
          '<div class="kind-value">' + m.get('kind') + '</div>',
        '</div>',
        '<div class="graph-sources">',
          '<div class="graph-sources-label">Sources:</div>',
          '<ul></ul>',
        '</div>',
        '<a href="#" class="delete">Delete</a>',
      '</div>'
    ];
    this.elInner.html(html.join(''));
    
    domUl = this.elInner.find('ul');
    _.each(sources, function(s) {
      html = [
        '<li>',
          '<span class="source-item">' + s + '</span>',
        '</li>'
      ];
      
      domItem = $(html.join(''));
      domUl.append(domItem);
    });
    domUl.append('<li class="pick-item"><a href="#" class="pick">Pick Sources</a></li>');
  },
  
  updateData: function() {
    var self = this
    ,   params = {}
    ,   range
    ;
    
    if (self.model.isNew()) {
      return;   // TODO: maybe render a no data thinger
    }
    
    range = DateRangePicker.getCurrentRange();
    
    params.granularity_in_minutes = range.granularityInMinutes;
    params.start_time = Math.floor(+range.startDate / 1000);
    params.end_time = Math.floor(+range.endDate / 1000);
    
    $.getJSON('/graphs/' + self.model.get('id') + '/data', params, function(data) {
      var seven = null;
      _.each(data, function(d) {
        if (!seven) {
          seven = new Seven('#' + self.graphId, {start: d.start_time * 1000, granularityInMinutes: range.granularityInMinutes, points: d.data.length, kind: self.model.get('kind')});
        }
        seven.graph({name: d.source, data: d.data})
      });
    });
  },
  
  onTick: function() {
    var range = DateRangePicker.getCurrentRange();
    if (+range.endDate > (+new Date() - 60000)) {
      this.updateData();
    }
  },
  
  onDateRangeChanged: function(evt, data) {
    this.updateData();
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
    ,   pos = this.model.get('position')
    ,   windowWidth = $(window).width()
    ,   openDir = 'right'
    ;
    
    $('.graph').removeClass('highlighted').addClass('dimmed');
    $(this.el).addClass('highlighted').removeClass('dimmed');
    
    if (windowWidth / 2 < pos.left * 30) {
      openDir = 'left';
    }
    
    sourceListInst.show({callback: this.onPick, sources: sourceObjs, cancel: this.onCancelPick, direction: openDir});
  },
  
  onPick: function(sources) {
    $('.graph').removeClass('highlighted dimmed');
    this.model.setSources(sources);
    this.model.save();
    this.mode = 'front';
    this.render();
  },
  
  onCancelPick: function() {
    $('.graph').removeClass('highlighted dimmed');
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
    this.cancel = function() {};
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
    
    this.callback = opts.callback || function() {};
    this.cancel = opts.cancel || function() {};
    
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
  
  onClickOk: function(evt) {
    var el = $(this.el)
    ,   selected = el.find('input:checked')
    ,   vals = _.map(selected, function(item) { return JSON.parse($(item).val()); })
    ;
    
    evt.preventDefault();
    
    this.callback(vals);
    this.hide();
  },
  
  onClickCancel: function(evt) {
    evt.preventDefault();
    this.cancel();
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

var DateRangePicker = Backbone.View.extend({
  events: {
    'click .custom-date': 'onClickCustomDate',
    'click .date-reset': 'onClickReset',
    'blur .date-starting-at': 'onBlurStart',
    'click input[type=radio]': 'onClickTimeSpan'
  },
  
  initialize: function() {
    _.bindAll(this, 'onClickCustomDate', 'onClickReset', 'onBlurStart', 'onClickTimeSpan');
    
    this.isCurrent = true;
    this.format = d3.time.format("%Y-%m-%d %H:%M");
    DateRangePicker.instance = this;
  },
  
  triggerTimeChange: function() {
    $(document.body).trigger('date_range_changed', this.getRange());
  },
  
  getRange: function() {
    return {isCurrent: this.isCurrent, startDate: this.getStartDate(), endDate: this.getEndDate(), granularityInMinutes: this.getGranularityInMinutes()};
  },
  
  // Returns '2_hours', '24_hours', '7_days'
  getRangeDuration: function() {
    return $(this.el).find('input[type=radio][name=time_span]:checked').val();
  },
  
  getGranularityInMinutes: function() {
    var r = this.getRangeDuration();
    if (r == '24_hours') {
      return 15;
    } else if (r == '7_days') {
      return 60;
    } else {
      return 1;
    }
  },
  
  getRangeMilliseconds: function() {
    var r = this.getRangeDuration();
    
    if (r == '24_hours') {
      return 24 * 60 * 60 * 1000;
    } else if (r == '7_days') {
      return 7 * 24 * 60 * 60 * 1000;
    } else {
      return 2 * 60 * 60 * 1000;  // 2 hour
    }
  },
  
  defaultStartDate: function() {
    var r = this.getRangeDuration()
    ,   now = +new Date()
    ;
    
    return new Date(now - this.getRangeMilliseconds());
  },
  
  // Get the start time as entered by the user, or the default.
  getStartDate: function() {
    var startInput = this.$('.date-starting-at')
    ,   startVal = startInput.val().trim()
    ;
    
    if (this.isCurrent || !startVal) {
      return this.defaultStartDate();
    } else {
      return this.format.parse(startVal) || this.defaultStartDate();
    }
  },
  
  // Calculate the end time
  getEndDate: function() {
    return new Date(+this.getStartDate() + this.getRangeMilliseconds());
  },
  
  setCurrent: function(wantItToBeCurrent) {
    var el = $(this.el)
    ,   startInput
    ;
    this.isCurrent = wantItToBeCurrent;
    if (this.isCurrent) {
      el.addClass('current');
    } else {
      startInput = this.$('.date-starting-at');
      el.removeClass('current');
      startInput.val(this.format(this.defaultStartDate())).focus();
    }
    this.updateEndingAt();
  },
  
  updateEndingAt: function() {
    var endingEl = this.$('.ending-at span')
    if (this.isCurrent) {
      endingEl.text('Now');
    } else {
      endingEl.text(this.format(this.getEndDate()));
    }
    this.triggerTimeChange();
  },
  
  onClickCustomDate: function(e) {
    e.preventDefault();
    this.setCurrent(!this.isCurrent);
  },
  
  onClickReset: function(e) {
    e.preventDefault();
    this.setCurrent(!this.isCurrent);
  },
  
  onBlurStart: function(e) {
    var el = $(this.el)
    ,   startInput = this.$('.date-starting-at')
    ,   startVal = startInput.val().trim()
    ;
    
    if (!startVal) {
      this.setCurrent(true);
    } else {
      this.updateEndingAt();
    }
  },
  
  onClickTimeSpan: function(e) {
    var el = $(this.el)
    ,   customDate = this.$('.custom-date')
    ,   range = this.getRangeDuration()
    ;
    
    if (range == '24_hours') {
      customDate.text('24 hours ago');
    } else if (range == '7_days') {
      customDate.text('7 days ago');
    } else {
      customDate.text('2 hours ago');
    }
    
    this.updateEndingAt();
  }
});

DateRangePicker.instance = null;
DateRangePicker.getCurrentRange = function() {
  return DateRangePicker.instance.getRange();
};

$(function() {
  var dblv = new DashboardListView({el: $('#dashboards')});
  
  new DashboardPane({el: $('#current-dashboard'), dashboardListView: dblv});
  new DateRangePicker({el: $('#date-range-picker')});
  
  sourceListInst = new SourceList(); // TODO: refactor to use instance pattern.
});

}(jQuery));