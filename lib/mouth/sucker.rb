module Mouth
  class Sucker < EM::Connection
    attr_accessor :reactor
    
    def receive_data(data)
      Mouth.logger.debug "UDP packet: '#{data}'"
      
      reactor.store!(data)
    end
  end
end