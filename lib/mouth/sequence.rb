module Mouth
  class Sequence
    
    # Generates a sample sequence of both counter and timing
    def self.generate_sample(opts = {})
      opts = {
        :namespace => "sample",
        :key => "sample",
        :start_time => (Time.now.to_i / 60 - 300),
        :end_time => (Time.now.to_i / 60),
      }.merge(opts)
      
      collection_name = "mouth_#{opts[:namespace]}"
      
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
        Mouth.collection(collection_name).insert({"t" => t, "c" => {opts[:key] => counter}, "m" => {opts[:key] => m_doc}})
        
        # Update counter randomly
        counter += rand(10) - 5
      end
      
      true
    end
  end
end
