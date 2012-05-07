module Mouth
  
   # {
   #   :dashboard_id => BSON::ObjectId,
   #   :position => {
   #     :top => 0,
   #     :left => 0,
   #     :height => 7,
   #     :width => 20
   #   },
   #   :kind => 'counter' || 'timer' || 'gauge',
   #   :sources => ["auth.authentications"]
   # }
  class Graph < Record
    
    #
    def save
      bson_object_id_ize(:dashboard_id) do
        super
      end
    end
    
    # Options:
    #  - :start_time (Time object)
    #  - :end_time (Time object)
    #  - :granularity_in_minutes
    def data(opts = {})
      sources = self.attributes[:sources] || []
      seq_opts = {:kind => self.attributes[:kind].to_sym}.merge(opts)
      sequence = SequenceQuery.new(sources, seq_opts)
      seqs = sequence.sequences
      seqs.map do |seq|
        {
          :data => seq[1],
          :start_time => sequence.start_time_epoch,
          :source => seq[0]
        }
      end
    end
    
    #
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
  end
end