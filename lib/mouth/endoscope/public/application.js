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
      $(this.el).html('<span>' + name + '</span><input type="text" value="' + name + '" />');
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
      'click .add-dashboard': 'onClickAddDashboard'
    },
    
    initialize: function() {
      $log("DashboardListView.initialize");
      
      _.bindAll(this, 'onClickAddDashboard', 'onAddDashboard', 'onResetDashboards');
      
      
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
  
  $(function() {
    $log("document.ready");
    
    var dblv = new DashboardListView({el: $('#dashboards')});
    
    
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