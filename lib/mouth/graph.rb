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
  #         :kind => "count",
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
    
  end
end