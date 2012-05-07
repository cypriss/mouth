$LOAD_PATH.unshift 'test'
require 'test_helper'

require 'mouth/sequence_query'

class SequenceTest < Test::Unit::TestCase
  def setup
    @start_time = Time.new(2012, 4, 1, 9, 30, 0, "-07:00")
    @end_time = Time.new(2012, 4, 1, 11, 30, 0, "-07:00")
    @namespace, @metric = Mouth.parse_key("test.test")
    
    @start_timestamp = @start_time.to_i / 60
    @end_timestamp = @end_time.to_i / 60
    
    counter = 1
    timer = {"count" => 5, "min" => 1, "max" => 10, "mean" => 5, "sum" => 20, "median" => 4, "stddev" => 2.3}
    (@start_timestamp..@end_timestamp).each do |t|
      # Insert the document into mongo
      Mouth.collection(Mouth.mongo_collection_name(@namespace)).update({"t" => t}, {"$set" => {"c.#{@metric}" => counter, "m.#{@metric}" => timer, "g.#{@metric}" => (t % 2 == 0 ? counter + 1 : nil)}}, :upsert => true)
    end
  end
  
  def test_minute_counter_sequences
    seq = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :start_time => @start_time, :end_time => @end_time)

    sequences = seq.sequences
    
    assert_equal ["test"], sequences.keys
    assert_equal 1, sequences.values.length
    
    values = sequences.values.first
    
    assert_equal 121, values.length
    
    assert values.all? {|v| v == 1} # The 'test' sequence is all ones
  end
  
  def test_15_minute_counter_sequences
    seq = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :granularity_in_minutes => 15, :start_time => @start_time, :end_time => @end_time)
    
    sequences = seq.sequences
    
    assert_equal ["test"], sequences.keys
    assert_equal 1, sequences.values.length
    
    values = sequences.values.first
    
    assert_equal 9, values.length
    assert_equal [15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 15.0, 1.0], values
  end
  
  def test_15_minute_timer_sequences_basic
    seq = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :kind => :timer, :granularity_in_minutes => 15, :start_time => @start_time, :end_time => @end_time)
    
    sequences = seq.sequences
    assert_equal ["test"], sequences.keys
    assert_equal 1, sequences.values.length
    
    values = sequences.values.first
    
    assert_equal 9, values.length
    
    timer =  {"count"=>75,
              "min"=>1,
              "max"=>10,
              "mean"=>4,
              "sum"=>300,
              "median"=>4,
              "stddev"=>3.780211634287159}
    assert_equal timer, values.first
  end
  
  def test_15_minute_timer_sequences_one_grouping
    @start_time = Time.new(2012, 4, 1, 9, 30, 0, "-07:00")
    @end_time = Time.new(2012, 4, 1, 9, 44, 0, "-07:00")
    
    @start_timestamp = @start_time.to_i / 60
    @end_timestamp = @end_time.to_i / 60
    
    col = Mouth.collection(Mouth.mongo_collection_name("test"))
    col.remove
    
    # NOTE: this data is totally fake, maybe we can get some real data
    timers = [
      {"count"=>3, "min"=>15, "max"=>30, "mean"=>100, "sum"=>300, "median"=>4, "stddev"=>1},
      {"count"=>6, "min"=>14, "max"=>32, "mean"=>90, "sum"=>540, "median"=>5, "stddev"=>2},
      {"count"=>9, "min"=>13, "max"=>30, "mean"=>85, "sum"=>765, "median"=>6, "stddev"=>3},
      {"count"=>12, "min"=>12, "max"=>30, "mean"=>80, "sum"=>960, "median"=>7, "stddev"=>4},
      {"count"=>15, "min"=>11, "max"=>30, "mean"=>70, "sum"=>1050, "median"=>8, "stddev"=>5},
      {"count"=>18, "min"=>10, "max"=>30, "mean"=>65, "sum"=>1170, "median"=>9, "stddev"=>6},
      {"count"=>21, "min"=>9, "max"=>30, "mean"=>60, "sum"=>1260, "median"=>10, "stddev"=>7},
      {"count"=>24, "min"=>8, "max"=>30, "mean"=>55, "sum"=>1320, "median"=>11, "stddev"=>8},
      {"count"=>27, "min"=>7, "max"=>30, "mean"=>50, "sum"=>1350, "median"=>12, "stddev"=>9},
      {"count"=>30, "min"=>6, "max"=>30, "mean"=>40, "sum"=>1200, "median"=>13, "stddev"=>10},
      {"count"=>33, "min"=>16, "max"=>30, "mean"=>30, "sum"=>990, "median"=>14, "stddev"=>11},
      {"count"=>36, "min"=>17, "max"=>30, "mean"=>20, "sum"=>720, "median"=>15, "stddev"=>12},
      {"count"=>39, "min"=>18, "max"=>30, "mean"=>10, "sum"=>390, "median"=>16, "stddev"=>13},
      {"count"=>42, "min"=>19, "max"=>30, "mean"=>5, "sum"=>210, "median"=>17, "stddev"=>14},
      {"count"=>45, "min"=>20, "max"=>30, "mean"=>1, "sum"=>45, "median"=>18, "stddev"=>15}
    ]
    i = 0
    (@start_timestamp..@end_timestamp).each do |t|
      col.update({"t" => t}, {"$set" => {"m.test" => timers[i]}}, :upsert => true)
      i += 1
    end
    
    seq = Mouth::SequenceQuery.new("test.test", :kind => :timer, :granularity_in_minutes => 15, :start_time => @start_time, :end_time => @end_time)
    values = seq.sequence
    
    assert_equal 1, values.length
    
    value = values.first
    
    expected_count = timers.collect {|t| t["count"] }.inject(0) {|s,c| s + c }
    expected_sum = timers.collect {|t| t["sum"] }.inject(0) {|s,c| s + c }
    
    assert_equal expected_count, value["count"]
    assert_equal expected_sum, value["sum"]
    assert_equal timers.collect {|t| t["min"] }.min, value["min"]
    assert_equal timers.collect {|t| t["max"] }.max, value["max"]
    assert_equal expected_sum / expected_count, value["mean"].to_i
    assert_equal 11, value["median"]
    assert_equal 29, value["stddev"].to_i # NOTE: i don't actually know if this is correct
    
  end
  
  def test_empty_timer
    @start_time = Time.new(2012, 4, 1, 9, 30, 0, "-07:00")
    @end_time = Time.new(2012, 4, 1, 9, 44, 0, "-07:00")
    
    @start_timestamp = @start_time.to_i / 60
    @end_timestamp = @end_time.to_i / 60
    
    col = Mouth.collection(Mouth.mongo_collection_name("test"))
    col.remove
    seq = Mouth::SequenceQuery.new("test.test", :kind => :timer, :granularity_in_minutes => 15, :start_time => @start_time, :end_time => @end_time)
    values = seq.sequence
    
    assert_equal [{"count"=>0,
                   "min"=>nil,
                   "max"=>nil,
                   "mean"=>nil,
                   "sum"=>0,
                   "median"=>nil,
                   "stddev"=>nil}], values
  end
  
  def test_empty_sequence
    @start_time = Time.new(2012, 4, 1, 9, 30, 0, "-07:00")
    @end_time = Time.new(2012, 4, 1, 9, 44, 0, "-07:00")
    
    @start_timestamp = @start_time.to_i / 60
    @end_timestamp = @end_time.to_i / 60
    
    col = Mouth.collection(Mouth.mongo_collection_name("test"))
    col.remove
    seq = Mouth::SequenceQuery.new("test.test", :kind => :counter, :granularity_in_minutes => 15, :start_time => @start_time, :end_time => @end_time)
    values = seq.sequence
    
    assert_equal [0], values
  end
  
  def test_minute_gauge_sequences
    seq = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :kind => :gauge, :start_time => @start_time, :end_time => @end_time)

    sequences = seq.sequences
    
    assert_equal ["test"], sequences.keys
    assert_equal 1, sequences.values.length
    
    values = sequences.values.first
    
    assert_equal 121, values.length
    
    assert values.all? {|v| v == 2}
  end
  
  def test_minute_time_sequence
    q = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :start_time => @start_time, :end_time => @end_time)
    ts = q.time_sequence
    assert_equal @start_time, ts.first
    assert_equal @end_time, ts.last
    assert_equal 121, ts.length
  end
  
  def test_minute_epoch_sequence
    q = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :start_time => @start_time, :end_time => @end_time)
    ts = q.epoch_sequence
    assert_equal @start_time.to_i, ts.first
    assert_equal @end_time.to_i, ts.last
  end
  
  def test_15_minute_time_sequence
    q = Mouth::SequenceQuery.new("#{@namespace}.#{@metric}", :start_time => @start_time, :end_time => @end_time, :granularity_in_minutes => 15)
    ts = q.time_sequence
    assert_equal Time.new(2012, 4, 1, 9, 30, 0, "-07:00"), ts.first
    assert_equal Time.new(2012, 4, 1, 11, 30, 0, "-07:00"), ts.last
    assert_equal q.sequence.length, ts.length
  end
  
end