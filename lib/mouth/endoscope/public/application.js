(function($) {
  
  var Dashboard = Backbone.Model.extend({
    defaults: {
      is_default: false,
      order: 0
    },
    
    initialize: function(attrs) {
      //console.log("Dashboard initialize! ", attrs);
    }
  });
  
  var DashboardList = Backbone.Collection.extend({
    model: Dashboard,
    url: '/dashboards',
    
    poop: function() {
      console.log("POOOOOOP");
    }
  });
  
  var DashboardView = Backbone.View.extend({
    
  });
  
  var DashboardListView = Backbone.View.extend({
    
    events: {
      'click .add-dashboard': 'onClickAddDashboard'
    },
    
    initialize: function() {
      _.bindAll(this, 'onClickAddDashboard', 'onAddDashboard', 'onResetDashboards');
      console.log("initializing dashboard");
      
      this.collection = new DashboardList();
      this.collection.bind('add', this.onAddDashboard);
      this.collection.bind('reset', this.onResetDashboards);
      this.collection.fetch();
      
      
    },
    
    render: function() {
      
    },
    
    onClickAddDashboard: function(evt) {
      evt && evt.preventDefault();
      console.log("onClickAddDashboard entered.");
    },
    
    onAddDashboard: function() {
      console.log("onAddDashboard entered.");
    },
    
    onResetDashboards: function(col) {
      console.log("onResetDashboards entered. ", whatareyou);
      
      
      
    }
  });
  
  $(function() {
    console.log("loaded");
    
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