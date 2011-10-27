module Mouth
  
  # dashboard_id
  # 
  # position:
  #   top, left, height, width
  # 
  # start_time -- in minutes (Time.now.to_i / 60)
  # end_time -- in minutes
  # granularity -- :minute, :hour, :day
  # 
  # series: [] of
  #   kind - line (default), bar, bar-stacked, area-stacked
  #   color
  #   source: mouth_xxx
  # 
  # {
  #     :dashboard_id => "8osdg8a6sdg98",
  #     :position => {
  #       :top => 0,
  #       :left => 0,
  #       :height => 20,
  #       :width => 50
  #     },
  #     
  #     # minutes for the window
  #     :window => 240,
  #     :granularity => "minute",
  #     :series => [
  #       {
  #         :kind => "line",
  #         :color => "red",
  #         :source => {
  #           :collection => "mouth_auth",
  #           :kind => "count",
  #           :key => "inline_logged_in"
  #         }
  #       }
  #     ]
  #   }
  class Graph < Record
    
    def self.for_dashboard(dashboard_id)
      collection.find({:dashboard_id => BSON::ObjectId(dashboard_id.to_s)}).to_a.collect {|g| new(g) }
    end
    
  end
end