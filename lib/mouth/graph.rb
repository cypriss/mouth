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
    
    # TODO: put in own file or find a way to delete this shit
    class Attributable
      attr_accessor :all_attributes
      def initialize(a)
        self.all_attributes = a
      end
    end
    
    def save
      bson_object_id_ize(:dashboard_id) do
        super
      end
    end
    
    def data
      end_time = 21972511 #Time.now.to_i / 60 - (4*24*60)
      start_time = end_time - self.attributes[:window]
      
      d = self.attributes[:series].collect do |s|
        col = Mouth.mongo.collection(s[:source][:collection])
        if self.attributes[:granularity] == "minute"
          col.find({:t => {"$gte" => start_time, "$lte" => end_time}}).to_a
        else
          
        end
      end
      
      a= if self.attributes[:granularity] == "minute"
        self.class.collection.find({:t => {"$gte" => start_time, "$lte" => end_time}}).to_a
      end
      a
      #Attributable.new a
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