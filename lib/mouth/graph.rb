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
          if kind == "c"
            entries = col.find({:t => {"$gte" => start_time, "$lte" => end_time}}).sort("t", 1).to_a.collect {|e| e[kind][key] }
          else
            # For now, let's just graph the mean. TODO: return a tuple here
            entries = col.find({:t => {"$gte" => start_time, "$lte" => end_time}}).sort("t", 1).to_a.collect {|e| e[kind][key]["mean"] }
          end
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
      self.attributes = orig_attrs
      res
    end
    
    def self.for_dashboard(dashboard_id)
      collection.find({:dashboard_id => BSON::ObjectId(dashboard_id.to_s)}).to_a.collect {|g| new(g) }
    end
    
    def self.sample
      cur_time = Time.now.to_i / 60
      col = Mouth.mongo.collection("mouth_auth")
      
      beg_time = cur_time - 60*4 # 4 hours
      (beg_time..cur_time).each do |t|
        doc = {"c" => {"inline_logged_in" => rand(100)}, "t" => t}
        col.insert(doc)
      end
      
    end
    
  end
end