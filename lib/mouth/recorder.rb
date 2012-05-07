module Mouth
  
  # If you don't want to use the Mouth daemon to collect UDP packets and write digests, you can use this to write metrics directly into mongo.
  # IMPORTANT: You can't use this + the daemon simultaneously for a given metric namespace.
  module Recorder
    class << self
      
      def increment(key, delta = 1, sample_rate = nil)
        factor = 1.0
        if sample_rate
          sample_rate = 1 if sample_rate > 1
          return if rand > sample_rate
          factor = (sample_rate <= 0.0 || sample_rate > 1.0) ? 1.0 : 1.0 / sample_rate
        end
        
        ns, metric = Mouth.parse_key(key)
        collection = Mouth.collection_for(ns)
        t = Mouth.current_timestamp
        
        
        collection.update({"t" => t}, {"$inc" => {"c.#{metric}" => delta * factor}}, :upsert => true)
      end
      
      def gauge(key, value)
        ns, metric = Mouth.parse_key(key)
        collection = Mouth.collection_for(ns)
        t = Mouth.current_timestamp
        
        
        collection.update({"t" => t}, {"$set" => {"g.#{metric}" => value}}, :upsert => true)
      end
      
      def measure(key, milli = nil)
        raise "Not implemented"
      end
      
    end
  end
end
