module Mouth
  
  # Usage: 
  # Sequence.new("namespace.foobar_occurances").sequence
  # # => [4, 9, 0, ...]
  #
  # Sequence.new("namespace.foobar_occurances", :kind => :timer).sequence
  # # => [{:count => 3, :min => 1, ...}, ...]
  #
  # s = Sequence.new(...)
  # s.time_sequence
  # # => [Time.new(first datapoint), Time.new(second datapoint), ..., Time.new(last datapoint)]
  class Sequence
    
    attr_accessor :key
    attr_accessor :kind
    attr_accessor :granularity
    attr_accessor :start_time
    attr_accessor :end_time
    
    def initialize(key, opts = {})
      opts = {
        :kind => :counter,
        :granularity => :minute,
        :start_time => Time.now - (120 * 60),
        :end_time => Time.now,
      }.merge(opts)
      
      self.key = key
      self.kind = opts[:kind]
      self.granularity = opts[:granularity]
      self.start_time = opts[:start_time]
      self.end_time = opts[:end_time]
    end
    
    def sequence
      return sequence_for_minute if self.granularity == :minute
      raise Exception.new "Not implemented"
    end
    
    def time_sequence
    end
    
    # Epoch in seconds
    def epoch_sequence
    end
    
    protected
    
    def sequence_for_minute
      namespace, metric = Mouth.parse_key(self.key)
      collection = Mouth.collection(Mouth.mongo_collection_name(namespace))
      
      start_timestamp = self.start_time.to_i / 60
      end_timestamp = self.end_time.to_i / 60
      
      entries = collection.find({"t" => {"$gte" => start_timestamp, "$lte" => end_timestamp}}).sort("t", 1).to_a
      
      timestamp_to_metric = entries.inject({}) {|h, e| h[e["t"]] = e[self.kind == :counter ? "c" : "m"][metric]; h }
      
      default = self.kind == :counter ? 0 : {"count" => 0, "min" => nil, "max" => nil, "mean" => nil, "sum" => 0, "median" => nil, "stddev" => nil}
      
      seq = []
      (start_timestamp..end_timestamp).each do |t|
        seq << (timestamp_to_metric[t] || default)
      end
      
      seq
    end
    
    public
    
    # Generates a sample sequence of both counter and timing
    def self.generate_sample(opts = {})
      opts = {
        :namespace => "sample",
        :metric => "sample",
        :start_time => (Time.now.to_i / 60 - 300),
        :end_time => (Time.now.to_i / 60),
      }.merge(opts)
      
      collection_name = Mouth.mongo_collection_name(opts[:namespace])
      
      counter = 99
      (opts[:start_time]..opts[:end_time]).each do |t|
        
        # Generate garbage data for the sample
        # NOTE: candidate for improvement
        m_count = rand(20) + 1
        m_mean = rand(20) + 40
        m_doc = {
          "count" => m_count,
          "min" => rand(20),
          "max" => rand(20) + 80,
          "mean" => m_mean,
          "sum" => m_mean * m_count,
          "median" => m_mean + rand(5),
          "stddev" => rand(10)
        }
        
        # Insert the document into mongo
        Mouth.collection(collection_name).insert({"t" => t, "c" => {opts[:metric] => counter}, "m" => {opts[:metric] => m_doc}})
        
        # Update counter randomly
        counter += rand(10) - 5
        counter = 0 if counter < 0
      end
      
      true
    end
  end
end
