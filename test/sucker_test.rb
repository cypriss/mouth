$LOAD_PATH.unshift 'test'
require 'test_helper'

class SuckerTest < Test::Unit::TestCase
  def setup
    puts "Setup"
  end
  
  def test_storing_count
    r = Mouth::Reactor.new
    
    r.store!("c:happening:3")
    
    assert_equal ({"happening" => 3}), r.counters.values.first
  end
  
  def test_storing_timer
    r = Mouth::Reactor.new
    
    r.store!("ms:happening:3.7")
    assert_equal ({"happening"=>[3.7]}), r.timers.values.first
  end
end