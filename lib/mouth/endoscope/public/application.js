(function($) {
  
  var $log = function() { console.log.apply(console, arguments); };
  
  var Dashboard = Backbone.Model.extend({
    defaults: {
      width: 100,
      height: 100
    },
    
    initialize: function(attrs) {
      $log("Dashboard.initialize ", attrs);
    }
  });
  
  var DashboardList = Backbone.Collection.extend({
    model: Dashboard,
    url: '/dashboards'
    
    
  });
  
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
      self.$('ul').append(dbItemView.render().el);
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
    
    
    initialize: function(opts) {
      $log("DashboardPane.initialize ", opts);
      
      _.bindAll(this, 'render', 'onCurrentChange');
      
      this.dashboard = null;
      this.dashboardList = opts.dashboardListView;
      this.dashboardList.bind('current_change', this.onCurrentChange);
      
      this.model = null;
      
      this.elTitle = this.$('h2');
      this.elGrid= this.$('.grid');
      
      this.render();
    },
    
    render: function() {
      
      this.elTitle.text((this.model && this.model.get('name')) || "(none)");
      
      return this;
    },
    
    onCurrentChange: function(model) {
      $log("DashboardPane.onCurrentChange: ", model);
      this.model = model;
      this.render();
    }
  });
  
  $(function() {
    $log("document.ready");
    
    var dblv = new DashboardListView({el: $('#dashboards')});
    var dbpane = new DashboardPane({el: $('#current_dashboard'), dashboardListView: dblv});
    
    
    // var d = new DashboardList();
    // 
    // d.fetch({
    //   success: function(col, response) {
    //     //console.log(" yay success");
    //     //console.log(col.at(0));
    //   }
    // });
    
    

  });
  
}(jQuery));