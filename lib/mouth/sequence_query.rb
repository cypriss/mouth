module Mouth
  
  # Usage: 
  # SequenceQuery.new(["namespace.foobar_occurances"]).sequences
  # # => {"foobar_occurances" => [4, 9, 0, ...]}
  #
  # SequenceQuery.new(["namespace.foobar_occurances", "namespace.baz"], :kind => :timer).sequences
  # # => {"foobar_occurances" => [{:count => 3, :min => 1, ...}, ...], "baz" => [...]}
  #
  # s = SequenceQuery.new(...)
  # s.time_sequence
  # # => [Time.new(first datapoint), Time.new(second datapoint), ..., Time.new(last datapoint)]
  class SequenceQuery
    
    attr_accessor :keys
    attr_accessor :kind
    attr_accessor :granularity_in_minutes
    attr_accessor :start_time
    attr_accessor :end_time
    attr_accessor :namespace
    attr_accessor :metrics
    
    def initialize(keys, opts = {})
      opts = {
        :kind => :counter,
        :granularity_in_minutes => 1,
        :start_time => Time.now - (119 * 60),
        :end_time => Time.now,
      }.merge(opts)
      
      self.keys = Array(keys)
      self.kind = opts[:kind]
      self.granularity_in_minutes = opts[:granularity_in_minutes]
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
    
    def sequence
      sequences.values.first
    end
    
    def sequences
      return sequences_for_minute if self.granularity_in_minutes == 1
      sequences_for_x_minutes(self.granularity_in_minutes)
    end
    
    def start_time_epoch
      if self.granularity_in_minutes == 1
        (self.start_time.to_i / 60) * 60
      else
        timestamp_to_nearest(self.start_time, self.granularity_in_minutes, :down) * 60
      end
    end
    
    def time_sequence
      if self.granularity_in_minutes == 1
        start_timestamp = self.start_time.to_i / 60
        end_timestamp = self.end_time.to_i / 60
      else
        start_timestamp = timestamp_to_nearest(self.start_time, self.granularity_in_minutes, :down)
        end_timestamp = timestamp_to_nearest(self.end_time, self.granularity_in_minutes, :up) - 1
      end
      
      seq = []
      (start_timestamp..end_timestamp).step(self.granularity_in_minutes) do |ts|
        seq << Time.at(ts * 60)
      end
      seq
    end
    
    # Epoch in seconds
    def epoch_sequence
      time_sequence.collect(&:to_i)
    end
    
    protected
    
    def sequences_for_x_minutes(minutes)
      start_timestamp = timestamp_to_nearest(self.start_time, minutes, :down)
      end_timestamp = timestamp_to_nearest(self.end_time, minutes, :up)
      # Then, for a timestamp xyz, it's in bucket (xyz - start_timestamp) / minutes
      
      ###
      map_function = <<-JS
        function() {
          var doc = {t: this.t, m: {}, c: {}, g: {}}
          ,   thisMetrics = this.#{self.kind_letter.to_s} || {}
          ,   docMetrics = doc.#{self.kind_letter.to_s}
          ,   fields = #{self.metrics.to_s}
          ,   i, k, val
          ;
          
          for (i = 0; i < fields.length; i += 1) {
            val = thisMetrics[fields[i]];
            if (typeof val != "undefined") {
              docMetrics[fields[i]] = val;
            }
          }
          
          emit(Math.floor((this.t - #{start_timestamp}) / #{minutes}), doc);
        }
      JS
  
      reduce_function = <<-JS
        function(key, values) {
          var result = {c: {}, m: {}, g: {}}
          ,   k
          ,   existing
          ,   current
          ;
  
          values.forEach(function(value) {
            if (value.c) {
              for (k in value.c) {
                existing = result.c[k] || 0;
                result.c[k] = existing + value.c[k];
              }
            }
            if (value.g) {
              for (k in value.g) {
                existing = result.g[k] || [0, -1];
                if (value.t > existing[1]) {
                  result.g[k] = [value.g[k], value.t];
                }
              }
            }
            if (value.m) {
              for (k in value.m) {
                current = value.m[k];
                existing = result.m[k];
                if (!existing) {
                  current.median = [current.median];
                  current.stddev = [current.stddev];
                  current.mean = [current.mean];
                  current.count = [current.count];
                  
                  result.m[k] = current;
                } else {
                  // {"count" => 0, "min" => nil, "max" => nil, "mean" => nil, "sum" => 0, "median" => nil, "stddev" => nil}
                  // Ok here existing is a non null one of these ^, and so is current.  We just need to merge them.
                  existing.min = existing.min < current.min ? existing.min : current.min;
                  existing.max = existing.max > current.max ? existing.max : current.max;
                  existing.sum = existing.sum + current.sum;
                  
                  // Save the individual stuff for later.  Need it later for proper merge.
                  existing.median.push(current.median);
                  existing.stddev.push(current.stddev);
                  existing.mean.push(current.mean);
                  existing.count.push(current.count);
                }
              }
            }
          });
          
          for (k in result.g) {
            result.g[k] = result.g[k][0];
          }
          
          for (k in result.m) {
            existing = result.m[k];
            
            var count = existing.median.length
            ,   middle = Math.floor(count / 2)
            ,   overallCount = 0
            ,   secondMoment = 0
            ,   mean
            ,   i
            ;
            
            // Total datapoints
            for (i = 0; i < count; i += 1) {
              overallCount = overallCount + existing.count[i];
            }
            
            // Mean
            mean = existing.sum / overallCount;
            
            // Median: approximate and take the median median.
            if (count % 2 == 0) {
              existing.median = (existing.median[middle] + existing.median[middle - 1]) / 2;
            } else {
              existing.median = existing.median[middle];
            }
            
            // Stddev
            // weighted average of "second moments": M2 += count(i)/overallCount * (stddev(i)^2 + mean(i)^2)
            // Then stddev = sqrt(M2 - mean^2)
            for (i = 0; i < count; i += 1) {
              var stddev_i = existing.stddev[i]
              ,   mean_i = existing.mean[i]
              ;
              
              secondMoment = secondMoment + (existing.count[i] / overallCount) * (stddev_i * stddev_i + mean_i * mean_i)
            }
            existing.stddev = Math.sqrt(secondMoment - mean * mean);
            
            // Mean:
            existing.mean = mean;
            
            // Count
            existing.count = overallCount;
          }
  
          return result;
        }
      JS
      
      result = collection.map_reduce(map_function, reduce_function, :out => {:inline => true}, :raw => true, :query => {"t" => {"$gte" => start_timestamp, "$lte" => end_timestamp}})
      
      docs = result["results"].collect do |r|
        ordinal = r["_id"]
        doc = r["value"]
        doc["t"] = (start_timestamp + ordinal * minutes).to_i
        doc
      end
      
      sequences_from_documents(docs, start_timestamp, end_timestamp - 1, minutes)
    end
    
    def sequences_for_minute
      start_timestamp = self.start_time.to_i / 60
      end_timestamp = self.end_time.to_i / 60
      
      docs = self.collection.find({"t" => {"$gte" => start_timestamp, "$lte" => end_timestamp}}, :fields => self.fields).to_a
      
      sequences_from_documents(docs, start_timestamp, end_timestamp, 1)
    end
    
    def sequences_from_documents(docs, start_timestamp, end_timestamp, minutes)
      timestamp_to_metrics = docs.inject({}) do |h, e|
        h[e["t"]] = e[self.kind_letter]
        h
      end
      
      default = case self.kind
      when :counter
        0
      when :timer
        {"count" => 0, "min" => nil, "max" => nil, "mean" => nil, "sum" => 0, "median" => nil, "stddev" => nil}
      when :gauge
        nil
      end
      
      seqs = {}
      self.metrics.each do |m|
        seq = []
        (start_timestamp..end_timestamp).step(minutes) do |t|
          mets = timestamp_to_metrics[t]
          seq << ((mets && mets[m]) || default)
        end
        seqs[m] = seq
      end
      
      if self.kind == :gauge
        seqs.each_pair do |met, seq|
          cur_val = nil
          seq.each_with_index do |v, i|
            seq[i] = cur_val || 0 unless v  # Note: In the future, we can remove || 0 and have leading nils.  Then, fill those in with values from a previous time period
            cur_val = v || cur_val
          end
        end
      end
      
      seqs
    end
    
    def collection
      @collection ||= Mouth.collection_for(self.namespace)
    end
    
    def kind_letter
      @kind_letter ||= case self.kind
      when :counter then "c"
      when :timer then "m"
      when :gauge then "g"
      end
    end
    
    def fields
      @fields ||= ["t"].concat(self.metrics.map {|m| "#{kind_letter}.#{m}" })
    end
    
    # timestamp_to_nearest(Time.now, 15, :down)
    # => t = 22122825 such that t * 60 is a second-epoch time on a 15-minute boundary, eg, 2012-01-23 17:45:00 
    def timestamp_to_nearest(time, minute, rounded = :down)
      start_timestamp = time.to_i / 60 # This is minute granularity
      if rounded == :down
        start_timestamp -= time.min % minute
      else
        start_timestamp += minute - time.min % minute
      end
    end
    
    public
    
    # Generates a sample sequence of both counter and timing
    def self.generate_sample(opts = {})
      opts = {
        :namespace => "sample",
        :metric => "sample",
        :start_time => (Mouth.current_timestamp - 300),
        :end_time => (Mouth.current_timestamp / 60),
      }.merge(opts)
      
      collection = Mouth.collection_for(opts[:namespace])
      
      counter = 99
      gauge = 50
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
        
        set = {"c.#{opts[:metric]}" => counter, "m.#{opts[:metric]}" => m_doc}
        if rand(4) == 0
          set["g.#{opts[:metric]}"] = gauge
        end
        
        # Insert the document into mongo
        collection.update({"t" => t}, {"$set" => set}, :upsert => true)
        
        # Update counter randomly
        counter += rand(10) - 5
        gauge += rand(10) - 5
        counter = 0 if counter < 0
        gauge = 0 if gauge < 0
      end
      
      true
    end
  end
end
