$LOAD_PATH.unshift 'test'
require 'test_helper'

require 'mouth/instrument'

class MouthInstrumentTest < Test::Unit::TestCase
  def setup
    @@udp ||= UDPSocket.new.tap do |u|
      u.bind("127.0.0.1", 32123)
    end
    @udp = @@udp
    100.times { @udp.recvfrom_nonblock(1024) } rescue nil
    Mouth.daemon_hostport = "127.0.0.1:32123"
  end
  
  def test_increment
    Mouth.increment("bob")
    
    res =  @udp.recvfrom(1024)
    assert_equal "bob:1|c", res[0]
  end
  
  def test_increment_delta
    Mouth.increment("bob.rob", 123)
    
    res =  @udp.recvfrom(1024)
    assert_equal "bob.rob:123|c", res[0]
  end
  
  def test_increment_sample
    pack = nil
    nothing = false
     
    100.times do
      Mouth.increment("bob.rob/blah-haha", 123, 0.1)
      
      begin
        pack ||= @udp.recvfrom_nonblock(1024)
        break if nothing
      rescue IO::WaitReadable
        nothing = true
      end
    end
    
    assert nothing
    assert_equal "bob.rob/blah-haha:123|c|@0.1", pack[0]
  end
  
  def test_gauge
    Mouth.gauge("bob", 77)
    
    res =  @udp.recvfrom(1024)
    assert_equal "bob:77|g", res[0]
  end
  
  def test_measure
    Mouth.measure("bob", 1.2)
    
    res =  @udp.recvfrom(1024)
    assert_equal "bob:1.2|ms", res[0]
  end
  
  def test_measure_block
    result = Mouth.measure("bob") do
      sleep 0.2
      9876
    end
    
    assert_equal 9876, result
    
    res =  @udp.recvfrom(1024)[0]
    m = res.match(/bob:(\d+)\|ms/)
    assert m
    
    # Make sure the number is within a resonable range
    assert m[1].to_i > 180
    assert m[1].to_i < 220
  end
end
