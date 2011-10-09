require 'sinatra/base'
require 'erb'

module Mouth
  class Endoscope < Sinatra::Base
    
    dir = File.dirname(File.expand_path(__FILE__))

    set :views,  "#{dir}/endoscope/views"
    set :public, "#{dir}/endoscope/public"
    
    get '/' do
      erb :dashboard
    end
  end
end