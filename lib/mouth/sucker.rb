require 'em-mongo'
require 'eventmachine'

module Mouth
  
  class SuckerConnection < EM::Connection
    attr_accessor :sucker
  
    def receive_data(data)
      Mouth.logger.debug "UDP packet: '#{data}'"
  
      sucker.store!(data)
    end
  end
  
  class Sucker
    
    # Host/Port to suck UDP packets on
    attr_accessor :host
    attr_accessor :port

    # Actual EM::Mongo connection
    attr_accessor :mongo_db
    
    # Info to connect to mongo
    attr_accessor :mongo_db_name
    attr_accessor :mongo_hosts
    
    # Accumulators of our data
    attr_accessor :counters
    attr_accessor :timers
    
    def initialize(options = {})
      self.host = options[:host] || "localhost"
      self.port = options[:port] || 8889
      self.mongo_db_name = options[:mongo_db_name] || "mouth"
      self.mongo_hosts = options[:mongo_hosts] || ["localhost"]
      
      self.counters = {}
      self.timers = {}
    end
    
    def suck!
      EM.run do
        # Connect to mongo now
        self.mongo_db

        EM.open_datagram_socket host, port, SuckerConnection do |conn|
          conn.sucker = self
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
    
    # counter: gorets:1|c
    # counter w/ sampling: gorets:1|c|@0.1
    # timer: glork:320|ms
    # (future) gauge: gaugor:333|g
    def store!(data)
      key_value, command_sampling = data.split("|", 2)
      key, value = key_value.to_s.split(":")
      command, sampling = command_sampling.split("|")
      
      key = Mouth.parse_key(key).join(".")
      value = value.to_f
      
      ts = minute_timestamps
      
      if command == "ms"
        self.timers[ts] ||= {}
        self.timers[ts][key] ||= []
        self.timers[ts][key] << value
      elsif command == "c"
        factor = 1.0
        if sampling
          factor = sampling.sub("@", "").to_f
          factor = (factor == 0.0 || factor > 1.0) ? 1.0 : 1.0 / factor
        end
        self.counters[ts] ||= {}
        self.counters[ts][key] ||= 0.0
        self.counters[ts][key] += value * factor
      end
    end
    
    def flush!
      ts = minute_timestamps
      limit_ts = ts - 1
      mongo_docs = {}
      
      # We're going to construct mongo_docs which look like this:
      # "mycollections:234234": {  # NOTE: this timpstamp will be popped into .t = 234234
      #   c: {
      #     happenings: 37,
      #     affairs: 3
      #   },
      #   m: {
      #     occasions: {...}
      #   }
      # }
      
      self.counters.each do |cur_ts, counters_to_save|
        if cur_ts <= limit_ts
          counters_to_save.each do |counter_key, value|
            ns, sub_key = Mouth.parse_key(counter_key)
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
            ns, sub_key = Mouth.parse_key(timer_key)
            mongo_key = "#{ns}:#{ts}"
            mongo_docs[mongo_key] ||= {}
            
            cur_mongo_doc = mongo_docs[mongo_key]
            cur_mongo_doc["m"] ||= {}
            cur_mongo_doc["m"][sub_key] = analyze_timer(values)
          end
          
          self.timers.delete(cur_ts)
        end
      end
      
      save_documents!(mongo_docs)
    end
    
    def save_documents!(mongo_docs)
      Mouth.logger.info "Saving Docs: #{mongo_docs.inspect}"
      
      mongo_docs.each do |key, doc|
        ns, ts = key.split(":")
        collection_name = "mouth_#{ns}"
        doc["t"] = ts.to_i
        
        self.mongo_db.collection(collection_name).insert(doc)
      end
    end
    
    def mongo_db
      @mongo_db ||= begin
        if self.mongo_hosts.length == 1
          EM::Mongo::Connection.new(self.mongo_hosts.first).db(self.mongo_db_name)
        else
          raise "TODO: ability to connect to a replica set."
        end
      end
    end
    
    private
    
    def minute_timestamps
      Time.now.to_i / 60
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
    
  end # class Sucker
end # module
