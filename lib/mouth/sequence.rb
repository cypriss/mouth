module Mouth
  
  # Usage: 
  # Sequence.new(["namespace.foobar_occurances"]).sequences
  # # => {"foobar_occurances" => [4, 9, 0, ...]}
  #
  # Sequence.new(["namespace.foobar_occurances", "namespace.baz"], :kind => :timer).sequences
  # # => {"foobar_occurances" => [{:count => 3, :min => 1, ...}, ...], "baz" => [...]}
  #
  # s = Sequence.new(...)
  # s.time_sequence
  # # => [Time.new(first datapoint), Time.new(second datapoint), ..., Time.new(last datapoint)]
  class Sequence
    
    attr_accessor :keys
    attr_accessor :kind
    attr_accessor :granularity
    attr_accessor :start_time
    attr_accessor :end_time
    attr_accessor :namespace
    attr_accessor :metrics
    
    def initialize(keys, opts = {})
      opts = {
        :kind => :counter,
        :granularity => :minute,
        :start_time => Time.now - (119 * 60),
        :end_time => Time.now,
      }.merge(opts)
      
      self.keys = Array(keys)
      self.kind = opts[:kind]
      self.granularity = opts[:granularity]
      self.start_time = opts[:start_time]
      self.end_time = opts[:end_time]
      
      self.metrics = []
      namespaces = []
      self.keys.each do |k|
        namespace, metric = Mouth.parse_key(k)
        namespaces << namespace
        self.metrics << metric
      end
      raise StandardError.new("Batch calculation must come from the same namespace") if namespaces.uniq.length > 1
      self.namespace = namespaces.first
    end
    
    def sequences
      return sequences_for_minute if self.granularity == :minute
      raise Exception.new "Not implemented"
    end
    
    def start_time_epoch
      (self.start_time.to_i / 60) * 60
    end
    
    def time_sequence
    end
    
    # Epoch in seconds
    def epoch_sequence
    end
    
    protected
    
    def sequences_for_minute
      collection = Mouth.collection(Mouth.mongo_collection_name(self.namespace))
      kind_letter = self.kind == :counter ? "c" : "m"
      start_timestamp = self.start_time.to_i / 60
      end_timestamp = self.end_time.to_i / 60
      
      fields = ["t"].concat(self.metrics.map {|m| "#{kind_letter}.#{m}" })
      entries = collection.find({"t" => {"$gte" => start_timestamp, "$lte" => end_timestamp}}, :fields => fields).to_a
      
      timestamp_to_metrics = entries.inject({}) do |h, e|
        h[e["t"]] = e[kind_letter]
        h
      end
      
      default = self.kind == :counter ? 0 : {"count" => 0, "min" => nil, "max" => nil, "mean" => nil, "sum" => 0, "median" => nil, "stddev" => nil}
      
      seqs = {}
      self.metrics.each do |m|
        seq = []
        (start_timestamp..end_timestamp).each do |t|
          mets = timestamp_to_metrics[t]
          seq << ((mets && mets[m]) || default)
        end
        seqs[m] = seq
      end
      
      seqs
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
        Mouth.collection(collection_name).update({"t" => t}, {"$set" => {"c.#{opts[:metric]}" => counter, "m.#{opts[:metric]}" => m_doc}}, :upsert => true)
        
        # Update counter randomly
        counter += rand(10) - 5
        counter = 0 if counter < 0
      end
      
      true
    end
  end
end
