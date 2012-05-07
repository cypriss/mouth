require 'socket'
require 'benchmark'

module Mouth
  unless self.respond_to?(:measure)
    class << self
      attr_accessor :daemon_host, :daemon_port, :disabled
      
      # Mouth.server = 'localhost:1234'
      def daemon_hostport=(hostport)
        self.daemon_host, port = hostport.split(':')
        self.daemon_port = port.to_i
      end
      
      def daemon_host
        @daemon_host || "localhost"
      end
      
      def daemon_port
        @daemon_port || 8889
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
      
      def gauge(key, value)
        write(key, value, :g)
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
        
        socket.send(command, 0, self.daemon_host, self.daemon_port) 
      end
    end
  end
end
