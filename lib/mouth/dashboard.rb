module Mouth
  
  # A dashboard has these fields:
  #  id
  #  name
  #  width
  #  height
  #  todo: order
  class Dashboard < Record
    
    def all_attributes
      self.attributes.tap {|attrs| attrs[:graphs] = graphs.collect(&:all_attributes) }
    end
    
    def destroy
      self.graphs.each(&:destroy)
      super
    end
    
    # An array of graphs
    def graphs
      @graphs ||= begin
        Graph.for_dashboard(self.attributes[:id])
      end
    end
  end
end
