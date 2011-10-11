require 'sinatra/base'
require 'erb'
require 'mouth/graph'
require 'mouth/dashboard'

module Mouth
  class Endoscope < Sinatra::Base
    
    dir = File.dirname(File.expand_path(__FILE__))

    set :views,  "#{dir}/endoscope/views"
    set :public, "#{dir}/endoscope/public"
    
    get '/' do
      dashboard = Dashboard.default
      
      erb :dashboard, {:layout => false}, :dashboard => dashboard
    end
  end
end