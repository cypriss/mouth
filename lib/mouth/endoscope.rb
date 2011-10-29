require 'sinatra/base'
require 'erb'
require 'mongo'
require 'yajl'

require 'mouth/record'
require 'mouth/graph'
require 'mouth/dashboard'
require 'mouth/stream'

module Mouth
  
  class << self
    attr_accessor :mongo
  end
  
  class Endoscope < Sinatra::Base
    
    dir = File.dirname(File.expand_path(__FILE__))

    set :views, "#{dir}/endoscope/views"
    set :public_folder, "#{dir}/endoscope/public"
    
    before do
      connect_to_mongo!
    end
    
    get '/' do
      erb :dashboard
    end
    
    
    ##
    ## Dashboard API
    ##
    
    # Returns all dashboards and all associated
    # If a dashboard does not exist, creates one
    get '/dashboards' do
      dashboards = Dashboard.all
      if dashboards.length == 0
        dashboards = [Dashboard.create(:name => "Main", :height => 100, :width => 100)]
      end
      
      render_json(dashboards)
    end
    
    get '/dashboards/:id' do
      d = Document.find(params[:id])
    end
    
    post '/dashboards' do
      d = Dashboard.create(json_input)
      render_json(d)
    end
    
    put '/dashboards/:id' do
    end
    
    delete '/dashboards/:id' do
    end
    
    ##
    ## Graph API
    ##
    
    post '/graphs' do
      g = Graph.create(json_input)
      render_json(g)
    end
    
    get '/graphs/:id/data' do
      d = Graph.find(params[:id]).data
      content_type 'application/json'
      Yajl::Encoder.encode(d)
    end
    
    ##
    ## Data
    ##
    
    get '/streams' do
      s = Stream.all
      render_json(s)
    end
    
    ##
    ## Helpers
    ##
    
    def json_input
      Yajl::Parser.parse(request.env["rack.input"].read)
    end
    
    def render_json(attributables)
      content_type 'application/json'
      encodable = if attributables.is_a?(Array)
        attributables.collect(&:all_attributes)
      else
        attributables.all_attributes
      end
      Yajl::Encoder.encode(encodable)
    end
    
    def connect_to_mongo!
      Mouth.mongo ||= begin
        puts "~~~~~~~~ GETTING NEW MONGO ~~~~~~~~~"
        Mongo::Connection.new("localhost").db("mouth")
      end
    end
    
  end
end