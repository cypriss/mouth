module Mouth
  
  class Dashboard
    
    def initialize
    end
    
    # An array of graphs
    def graphs
      g = []
      
      # What kind of connection?
      
      g
    end
    
    def self.all_with_default
      dashboards = Mouth.mongo.collection("dashboards").find.to_a
      dashboards << default if dashboards.length == 0
    end
    
    def self.default
      new
    end
    
    def self.load(name=nil)
      return new
    end
    
  end
end