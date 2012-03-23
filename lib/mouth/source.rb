module Mouth
  class Source
    
    attr_accessor :all_attributes
    
    def initialize(tuple)
      self.all_attributes = tuple
    end
    
    # Returns an array of tuples:
    # [{source: "auth.inline_logged_in", kind: "counter|timer"}, ...]
    def self.all
      col_names = Mouth.mongo.collections.collect(&:name) - %w(dashboards graphs system.indexes)
      col_names.select! {|c| c =~ /^mouth_.+/ }
      
      tuples = []
      col_names.each do |col_name|
        namespace = col_name.match(/mouth_(.+)/)[1]
        counters, timers = all_for_collection(Mouth.collection(col_name))
        counters.each {|s| tuples << {:source => "#{namespace}.#{s}", :kind => "counter"} }
        timers.each {|s| tuples << {:source => "#{namespace}.#{s}", :kind => "timer"} }
      end
      
      tuples.sort_by {|t| "#{t[:kind]}#{t[:source]}" }.collect {|t| new(t) }
    end
    
    def self.all_for_collection(col, window = Time.now.to_i / 60 - 120)
      map_function = <<-JS
        function() {
          var k, vh;
          for (k in this.c) {
            vh = {};
            vh[k] = true;
            emit("counters", {ks: vh});
          }
          for (k in this.m) {
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
