module Mouth
  
  # A dashboard has these fields:
  #  id
  #  name
  #  width
  #  height
  #  todo: order
  class Dashboard
    
    # Keys are symbols
    # id is :id, not _id
    attr_accessor :attributes
    
    def initialize(attrs = {})
      self.attributes = {}
      attrs.each_pair do |k, v|
        if k.to_s == "_id"
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
    
    def self.all
      collection.find.to_a.collect {|d| new(d) }
    end
  end
end
