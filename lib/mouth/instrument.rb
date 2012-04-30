require 'socket'
require 'benchmark'

module Mouth
  unless self.respond_to?(:measure)
    class << self
      attr_accessor :host, :port, :disabled
      
      # Mouth.server = 'localhost:1234'
      def server=(conn)
        self.host, port = conn.split(':')
        self.port = port.to_i
      end
      
      def host
        @host || "localhost"
      end
      
      def port
        @port || 8889
      end

      def measure(key, milli = nil)
        result = nil
        ms = milli || (Benchmark.realtime { result = yield } * 1000).to_i

        write(key, ms, :ms)

        result
      end

      def increment(key, delta = 1, sample_rate = nil)
        write(key, delta, :c, sample_rate)
      end

      protected

      def socket
        @socket ||= UDPSocket.new
      end

      def write(k, v, op, sample_rate = nil)
        return if self.disabled
        if sample_rate
          sample_rate = 1 if sample_rate > 1
          return if rand > sample_rate
        end
        
        command = "#{k}:#{v}|#{op}"
        command << "|@#{sample_rate}" if sample_rate
        
        socket.send(command, 0, self.host, self.port) 
      end
    end
  end
end
