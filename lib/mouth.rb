# Only include those things needed for the sucker/daemon, NOT the web server
require 'mouth/version'

module Mouth
  class << self
    attr_accessor :logger

    # Returns a connection to a mongo connection (NOT an em-mongo connection)
    def mongo
      @mongo ||= begin
        puts "~~~~~~~~ GETTING NEW MONGO ~~~~~~~~~"
        
        # require mongo here, as opposed to the top, because we don't want mongo included in the reactor (use em-mongo for that)
        require 'mongo'
        Mongo::Connection.new("localhost").db("mouth") # TODO: specify this with options
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
    
    def sanitize_key(key)
      key.gsub(/\s+/, '_').gsub(/\//, '-').gsub(/[^a-zA-Z_\-0-9]/, '')
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
      
      [sanitize_key(namespace), sanitize_key(metric)]
    end 
    

  end  
end