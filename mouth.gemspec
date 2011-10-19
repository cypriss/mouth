require './lib/mouth/version'

Gem::Specification.new do |s|
  s.name = 'mouth'
  s.version = Mouth::VERSION
  s.author = 'Jonathan Novak'
  s.email = 'jnovak@gmail.com'
  s.homepage = 'http://github.com/cypriss/mouth'
  s.summary = 'Collect and view stats in real time.'
  s.description = 'Ruby Daemon collects statistics via UDP packets, stores them in Mongo, and then views them via a user friendly Sintra app.'

  s.files = `git ls-files`.split("\n")
  s.test_files = `git ls-files test`.split("\n")
  s.require_path = 'lib'
  s.bindir = 'bin'
  s.executables << 'mouth' << 'mouth-endoscope'

  s.add_runtime_dependency 'em-mongo', '~> 0.4.1'       # For the EM collector
  s.add_runtime_dependency 'mongo', '~> 1.4.1'          # For the sinatra app
  s.add_runtime_dependency 'eventmachine', '~> 0.12.10'
  s.add_runtime_dependency 'vegas', '~> 0.1.8'
  s.add_runtime_dependency 'sinatra', '~> 1.3.1'
  s.add_runtime_dependency 'yajl-ruby', '~> 1.0.0'
  
  s.required_ruby_version = '>= 1.9.2'
  s.required_rubygems_version = '>= 1.3.4'
end