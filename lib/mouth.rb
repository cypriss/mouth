# Only include those things needed for the sucker/daemon, NOT the web server
require 'mouth/version'

module Mouth
  class << self
    attr_accessor :logger

    # Returns a connection to a mongo connection (NOT an em-mongo connection)
    def mongo
      @mongo ||= begin
        puts "~~~~~~~~ GETTING NEW MONGO ~~~~~~~~~"
        require 'mongo'
        Mongo::Connection.new("localhost").db("mouth") # TODO: specify this with options
      end
    end
    
    def collection(namespace)
      @collections ||= {}
      @collections[namespace] ||= begin
        c = mongo.collection(namespace)
        c.ensure_index([["t", 1]], {:background => true, :unique => true})
        c
      end
    end

  end  
end