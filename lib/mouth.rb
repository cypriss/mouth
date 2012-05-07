# Since the gem can be used in many ways (sucker daemon, sinatra app, instrument, ad-hoc, don't include anything)
require 'mouth/version'

module Mouth
  class << self
    attr_accessor :logger
    
    # Mongo connection
    attr_accessor :mongo
    
    # Info to connect to mongo
    attr_accessor :mongo_db_name
    attr_accessor :mongo_hostports

    # Returns a mongo connection (NOT an em-mongo connection)
    def mongo
      @mongo ||= begin
        require 'mongo'   # require mongo here, as opposed to the top, because we don't want mongo included in the reactor (use em-mongo for that)
        
        hostports = self.mongo_hostports || [["localhost", Mongo::Connection::DEFAULT_PORT]]
        self.mongo_hostports = hostports.collect do |hp|
          if hp.is_a?(String)
            host, port = hp.split(":")
            [host, port || Mongo::Connection::DEFAULT_PORT]
          else
            hp
          end
        end
        
        if self.mongo_hostports.length == 1
          hostport = self.mongo_hostports.first
          Mongo::Connection.new(hostport[0], hostport[1], :pool_size => 5, :pool_timeout => 20).db(self.mongo_db_name || "mouth")
        else
          raise "repls set con not impl"
        end
      end
    end
    
    def collection(collection_name)
      @collections ||= {}
      @collections[collection_name] ||= begin
        c = mongo.collection(collection_name)
        c.ensure_index([["t", 1]], {:background => true, :unique => true})
        c
      end
    end
    
    def mongo_collection_name(namespace)
      "mouth_#{namespace}"
    end
    
    def collection_for(namespace)
      collection(mongo_collection_name(namespace))
    end
    
    def sanitize_namespace(key)
      key.gsub(/\s+/, '_').gsub(/\//, '-').gsub(/[^a-zA-Z_\-0-9]/, '')
    end
    
    def sanitize_metric(key)
      key.gsub(/\s+/, '_').gsub(/[^a-zA-Z0-9\-_\/]/, '')
    end
    
    # Parses a key into two parts: namespace, and metric.  Also sanitizes each field
    # Returns an array of values: [namespace, metric]
    # eg,
    # parse_key("Ticket.process_new_ticket") # => ["Ticket", "process_new_ticket"]
    # parse_key("Forum List.other! stuff.ok") # => ["Forum_List", "other_stuff-ok"]
    # parse_key("no_namespace") # => ["default", "no_namespace"]
    def parse_key(key)
      parts = key.split(".")
      namespace = nil
      metric = nil
      if parts.length > 1
        namespace = parts.shift
        metric = parts.join("-")
      else
        namespace = "default"
        metric = parts.shift
      end
      
      [sanitize_namespace(namespace), sanitize_metric(metric)]
    end
    
    def current_timestamp
      timestamp_for(Time.now)
    end
    
    def timestamp_for(time)
      time.to_i / 60
    end

  end
end