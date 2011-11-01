module Mouth
  
  # dashboard_id
  # 
  # {
  #   :dashboard_id => "4ea9ea1e54a7825d4e000001",
  #   :position => {
  #     :top => 0,
  #     :left => 0,
  #     :height => 20,
  #     :width => 50
  #   },
  #   
  #   # minutes for the window
  #   :window => 240,
  #   :granularity => "minute",
  #   :series => [
  #     {
  #       :kind => "line",
  #       :color => "red",
  #       :source => {
  #         :collection => "mouth_auth",
  #         :kind => "counter",
  #         :key => "inline_logged_in"
  #       }
  #     }
  #   ]
  # }
  class Graph < Record
    
    def save
      bson_object_id_ize(:dashboard_id) do
        super
      end
    end
    
    # Options:
    #  - :window
    #  - :granularity
    def data(options = {})
      window = options[:window] || self.attributes[:window] || 240
      granularity = options[:granularity] || self.attributes[:granularity] || "minute"
      
      end_time = Time.now.to_i / 60
      start_time = end_time - window
      d = self.attributes[:series].collect do |s|
        col = Mouth.mongo.collection(s["source"]["collection"]) # TODO: use symbols here, convert all things coming from mongo to return symbols
        kind = s["source"]["kind"] == "timer" ? "ms" : "c"
        key = s["source"]["key"]
        
        if granularity == "minute"
          entries = col.find({:t => {"$gte" => start_time, "$lte" => end_time}}).sort("t", 1).to_a.collect {|e| e[kind][key] }
        else
          ["poop"]
        end
      end
    end
    
    def bson_object_id_ize(*args)
      orig_attrs = self.attributes.dup
      args.each do |a|
        self.attributes[a] = BSON::ObjectId(self.attributes[a])
      end
      res = yield
      orig_attrs[:id] = self.attributes[:id]
      self.attributes = orig_attrs
      
      res
    end
    
    def self.for_dashboard(dashboard_id)
      collection.find({:dashboard_id => BSON::ObjectId(dashboard_id.to_s)}).to_a.collect {|g| new(g) }
    end
    
    def self.sample_graphs
      dashboards = Dashboard.all
      if dashboards.length == 0
        dashboards = [Dashboard.create(:name => "Main", :height => 100, :width => 100)]
      end
      d = dashboards.first
      
      sg = {
        :dashboard_id => d.attributes[:id],
        :position => {
          :top => 0,
          :left => 20,
          :height => 7,
          :width => 20
        },
        :window => 240,
        :granularity => "minute",
        :series => [
          {
            :kind => "line",
            :color => "red",
            :source => {
              :collection => "mouth_auth",
              :kind => "counter",
              :key => "inline_logged_in"
            }
          }
        ]
      }
      Graph.create(sg)
      
      sg = {
        :dashboard_id => d.attributes[:id],
        :position => {
          :top => 0,
          :left => 0,
          :height => 7,
          :width => 20
        },
        :window => 240,
        :granularity => "minute",
        :series => [
          {
            :kind => "candle",
            :color => "blue",
            :source => {
              :collection => "mouth_auth",
              :kind => "timer",
              :key => "authentications"
            }
          }
        ]
      }
      Graph.create(sg)
      
    end
    
    def self.sample_data
      cur_time = Time.now.to_i / 60
      col = Mouth.mongo.collection("mouth_auth")
      col.remove
      beg_time = cur_time - 60*4 # 4 hours
      
      last_val = rand(100)
      (beg_time..cur_time).each do |t|
        last_val = last_val + rand(10) - 5
        doc = {"c" => {"inline_logged_in" => last_val}, "ms" => {}, "t" => t}
        mean = 50 + rand(20)
        doc["ms"]["authentications"] = {
          "count" => last_val,
          "min" => 20 + rand(20),
          "max" => 70 + rand(20),
          "mean" => mean,
          "sum" => last_val * mean,
          "median" => mean + rand(4),
          "stddev" => mean / 4,
        }
        col.insert(doc)
      end
      
    end
    
  end
end