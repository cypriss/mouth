require 'em-mongo'
require 'eventmachine'
require 'mouth/runner'
require 'mouth/reactor'

module Mouth
  class << self
    attr_accessor :logger
  end
end