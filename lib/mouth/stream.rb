module Mouth
  class Stream
    
    attr_accessor :all_attributes
    
    def initialize(tuple)
      self.all_attributes = tuple
    end
    
    # Returns an array of tuples:
    # [{collection: "mouth_auth", kind: "counter|timer", key: "inline_logged_in"}, ...]
    def self.all
      collections = Mouth.mongo.collections.collect(&:name) - %w(dashboards graphs system.indexes)
      tuples = []
      collections.each do |col|
        counters, timers = all_for_collection(Mouth.mongo.collection(col))
        counters.each {|key| tuples << {:collection => col, :kind => "counter", :key => key} }
        timers.each {|key| tuples << {:collection => col, :kind => "timer", :key => key} }
      end
      tuples.collect {|t| new(t) }
    end
    
    def self.all_for_collection(col, window = Time.now.to_i / 60 - 9880)
      map_function = <<-JS
        function() {
          var k, vh;
          for (k in this.c) {
            vh = {};
            vh[k] = true;
            emit("counters", {ks: vh});
          }
          for (k in this.ms) {
            vh = {};
            vh[k] = true;
            emit("timers", {ks: vh});
          }
        }
      JS
      
      reduce_function = <<-JS
        function(key, values) {
          var ret = {ks: {}}, k;
          
          values.forEach(function(value) {
            for (k in value.ks) {
              ret.ks[k] = true
            }
          });
          return ret;
        }
      JS
      
      result = col.map_reduce(map_function, reduce_function, :out => {:inline => true}, :raw => true, :query => {"t" => {"$gte" => window}})
      
      counters = []
      timers = []
      if result && result["results"].is_a?(Array)
        result["results"].each do |r|
          k, v = r["_id"], r["value"]
          if k == "timers"
            timers << v["ks"].keys
          elsif k == "counters"
            counters << v["ks"].keys
          end
        end
      end
      
      [counters.flatten.compact.uniq, timers.flatten.compact.uniq]
    end
    
  end
end
