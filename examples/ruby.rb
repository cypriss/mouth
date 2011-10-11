require 'socket'
require 'benchmark'

module Mouth
  class << self
    attr_accessor :host, :port, :disabled
    def server=(conn)
      self.host, port = conn.split(':')
      self.port = port.to_i
    end

    def measure(key, milli = nil)
      ms = milli || (Benchmark.realtime { yield } * 1000).to_i

      write(key, ms, :ms)

      ms
    end

    def increment(key, delta = 1)
      write(key, delta, :c)
      delta
    end

    protected

    def socket
      @socket ||= UDPSocket.new
    end

    def write(k, v, op)
      socket.send("#{op}:#{k}:#{v}", 0, self.host, self.port) unless self.disabled
    end
  end
end
Mouth.server = "127.0.0.1:8889"