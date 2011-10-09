require 'em-mongo'
require 'eventmachine'
require 'mouth/runner'
require 'mouth/sucker'
require 'mouth/version'

module Mouth
  class << self
    attr_accessor :logger
  end
end