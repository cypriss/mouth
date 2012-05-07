$LOAD_PATH.unshift 'test'
require 'test_helper'

require 'mouth/recorder'
require 'mouth/sequence_query'

class Recorder < Test::Unit::TestCase
  def setup
    Mouth.collection_for("test").remove
  end
  
  def test_increment
    Mouth::Recorder.increment("test.recorders")
    seq = Mouth::SequenceQuery.new("test.recorders").sequence
    assert_equal 1, seq.inject(0) {|s,e| s + e}
    assert_equal 1, seq.last
  end
  
  def test_increment_delta
    Mouth::Recorder.increment("test.recorders", 99)
    seq = Mouth::SequenceQuery.new("test.recorders").sequence
    assert_equal 99, seq.inject(0) {|s,e| s + e}
    assert_equal 99, seq.last
  end
  
  def test_increment_sample
    found_noop = false
    found_op = false
    100.times do # In theory this could falsely fail 0.0026561% of the time
      Mouth.collection_for("test").remove
      Mouth::Recorder.increment("test.recorders", 1, 0.1)
      seq = Mouth::SequenceQuery.new("test.recorders").sequence
      sum = seq.inject(0) {|s,e| s + e}
      if sum == 0
        found_noop = true
      elsif sum == 10
        found_op = true
      else
        assert false, "Sum should either be 0 or 10"
      end
      break if found_noop && found_op
    end
    assert found_noop
    assert found_op
  end
  
  def test_gauge
    Mouth::Recorder.gauge("test.recorders", 9)
    seq = Mouth::SequenceQuery.new("test.recorders", :kind => :gauge).sequence
    assert_equal 9, seq.inject(0) {|s,e| s + e}
    assert_equal 9, seq.last
  end
end