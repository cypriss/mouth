module Mouth
  
  # A dashboard has these fields:
  #  id
  #  name
  #  width
  #  height
  #  todo: order
  class Dashboard
    
    attr_accessor :attributes
    
    def initialize(attrs = {})
      self.attributes = {}
      attrs.each_pair do |k, v|
        if k == "_id"
          self.attributes[:id] = v.to_s
        else
          self.attributes[k.to_sym] = v
        end
      end
    end
    
    def save
      if self.attributes[:id]
        attrs = self.attributes.dup
        the_id = attrs.delete(:id)
        doc = self.class.collection.update({"_id" => BSON::ObjectId(the_id)}, attrs)
      else
        self.class.collection.insert(self.attributes)
        puts "000" * 100
        puts self.attributes.inspect
        self.attributes[:id] = self.attributes.delete(:_id).to_s
      end
      true
    end
    
    # An array of graphs
    def graphs
      g = []
      
      # What kind of connection?
      
      g
    end
    
    def self.collection
      @collection ||= Mouth.mongo.collection("dashboards")
    end
    
    def self.create(attributes)
      r = new(attributes)
      r.save
      r
    end
    
    def self.all_with_default
      dashboards = collection.find.to_a
      if dashboards.length == 0
        d = default
        d.save
        [d]
      else
        dashboards.collect {|d| new(d) }
      end
    end
    
    def self.default
      new(:name => "Main", :height => 100, :width => 100)
    end
    
  end
end