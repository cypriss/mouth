require 'sinatra/base'
require 'erb'
require 'mongo'

require 'mouth/graph'
require 'mouth/dashboard'

module Mouth
  
  class << self
    attr_accessor :mongo
  end
  
  class Endoscope < Sinatra::Base
    
    dir = File.dirname(File.expand_path(__FILE__))

    set :views,  "#{dir}/endoscope/views"
    set :public, "#{dir}/endoscope/public"
    
    get '/' do
      erb :dashboard
    end
    
    
    ##
    ## Dashboard API
    ##
    
    # Returns all dashboards and all associated
    # If a dashboard does not exist, creates one
    get '/dashboards' do
      connect_to_mongo! # TODO: before filter
      dashboards = Dashboard.all_with_default
#      content_type 'application/json'
#      '{"hello":"world"}'
      dashboards.inspect
    end
    
    get '/dashboards/:id' do
    end
    
    post '/dashboards' do
    end
    
    put '/dashboards/:id' do
    end
    
    delete '/dashboards/:id' do
    end
    
    ##
    ## Graph API
    ##
    
    def connect_to_mongo!
      Mouth.mongo ||= Mongo::Connection.new("localhost").db("mouth")
    end
    
  end
end