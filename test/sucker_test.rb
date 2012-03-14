$LOAD_PATH.unshift 'test'
require 'test_helper'

require 'mouth/sucker'

class SuckerTest < Test::Unit::TestCase
  def setup
  end
  
  def test_storing_count
    r = Mouth::Sucker.new
    
    r.store!("c:happening:3")
    
    assert_equal ({"default.happening" => 3}), r.counters.values.first
  end
  
  def test_storing_timer
    r = Mouth::Sucker.new
    
    r.store!("m:happening:3.7")
    assert_equal ({"default.happening" => [3.7]}), r.timers.values.first
  end
  
  def test_different_types_of_characters
    r = Mouth::Sucker.new
    
    r.store!("m:abc/123.hello/789 foobar.baz:3.7")
    assert_equal ({"abc-123.hello/789_foobar-baz" => [3.7]}), r.timers.values.first
  end
end