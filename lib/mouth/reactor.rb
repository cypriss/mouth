module Mouth
  class Reactor
    attr_accessor :host
    attr_accessor :port

    attr_accessor :counters
    attr_accessor :timers
    
    attr_accessor :mongo_db
    
    def initialize(options = {})
      self.host = options[:host] || "localhost"
      self.port = options[:port] || 8887
      
      self.counters = {}
      self.timers = {}
      
      # Start the EM loop.  Doesn't return.
      react!
    end
    
    def react!
      EM.run do
        self.mongo_db = EM::Mongo::Connection.new('localhost').db('mouth')
        
        EM.open_datagram_socket host, port, Mouth::Sucker do |udp_conn|
          udp_conn.reactor = self
        end
        
        EM.add_periodic_timer(10) do
          Mouth.logger.info "Counters: #{self.counters.inspect}"
          Mouth.logger.info "Timers: #{self.timers.inspect}"
          self.flush!
        end

        EM.next_tick do
          Mouth.logger.info "Mouth reactor started..."
        end
      end
    end
    
    def store!(data)
      command, key, value = data.split(":")
      key = sanitize_key(key)
      value = value.to_f
      
      ts = minute_timestamps
      
      if command == "ms"
        self.timers[ts] ||= {}
        self.timers[ts][key] ||= []
        self.timers[ts][key] << value
      elsif command == "c"
        self.counters[ts] ||= {}
        self.counters[ts][key] ||= 0.0
        self.counters[ts][key] += value
      end
    end
    
    def flush!
      ts = minute_timestamps
      limit_ts = ts - 1
      mongo_docs = {}
      
      # {
      #   t: 33353
      #   c: {
      #     poopings: 37,
      #     shittings: 3
      #   },
      #   ms: {
      #     peeings: {...}
      #   }
      # }
      
      self.counters.each do |cur_ts, counters_to_save|
        if cur_ts <= limit_ts
          counters_to_save.each do |counter_key, value|
            ns, sub_key = parse_key(counter_key)
            mongo_key = "#{ns}:#{ts}"
            mongo_docs[mongo_key] ||= {}
            
            cur_mongo_doc = mongo_docs[mongo_key]
            cur_mongo_doc["c"] ||= {}
            cur_mongo_doc["c"][sub_key] = value
          end
          
          self.counters.delete(cur_ts)
        end
      end
      
      self.timers.each do |cur_ts, timers_to_save|
        if cur_ts <= limit_ts
          timers_to_save.each do |timer_key, values|
            ns, sub_key = parse_key(timer_key)
            mongo_key = "#{ns}:#{ts}"
            mongo_docs[mongo_key] ||= {}
            
            cur_mongo_doc = mongo_docs[mongo_key]
            cur_mongo_doc["ms"] ||= {}
            cur_mongo_doc["ms"][sub_key] = analyze_timer(values)
          end
          
          self.timers.delete(cur_ts)
        end
      end
      
      Mouth.logger.info "Flushing Docs: #{mongo_docs.inspect}"
      
      save_documents!(mongo_docs)
    end
    
    def save_documents!(mongo_docs)
      mongo_docs.each do |key, doc|
        ns, ts = key.split(":")
        collection_name = "mouth_#{ns}"
        doc["t"] = ts
        
        self.mongo_db.collection(collection_name).insert(doc)
      end
    end
    
    private
    
    def minute_timestamps
      Time.now.to_i / 60
    end
    
    def sanitize_key(key)
      key.gsub(/\s+/, '_').gsub(/\//, '-').gsub(/[^a-zA-Z_\-0-9\.]/, '')
    end
    
    # Parses a key into two parts: namespace, and key.  Also sanitizes each field
    # Returns an array of values: [namespace, key]
    # eg,
    # parse_key("Ticket.process_new_ticket") # => ["Ticket", "process_new_ticket"]
    # parse_key("Forum List.other! crap.ok") # => ["Forum_List", "other_crap.ok"]
    # parse_key("no_namespace") # => ["default", "no_namespace"]
    def parse_key(key)
      parts = key.split(".")
      ns = nil
      sub_key = nil
      if parts.length > 1
        ns = parts.shift
        sub_key = parts.join(".")
      else
        ns = "default"
        sub_key = parts.shift
      end
      
      [sanitize_key(ns), sanitize_key(sub_key)]
    end
    
    def analyze_timer(values)
      values.sort!
      
      count = values.length
      min = values[0]
      max = values[-1]
      mean = nil
      sum = 0.0
      median = median_for(values)
      stddev = 0.0
      
      values.each {|v| sum += v }
      mean = sum / count
      
      values.each do |v|
        devi = v - mean
        stddev += (devi * devi)
      end
      
      stddev = Math.sqrt(stddev / count)
      
      {
        "count" => count,
        "min" => min,
        "max" => max,
        "mean" => mean,
        "sum" => sum,
        "median" => median,
        "stddev" => stddev,
      }
    end
    
    def median_for(values)
      count = values.length
      middle = count / 2
      if count == 0
        return 0
      elsif count % 2 == 0
        return (values[middle] + values[middle - 1]).to_f / 2
      else
        return values[middle]
      end
    end
    
  end # class Reactor
end # module
