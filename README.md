# Mouth

Mouth is a Ruby daemon that collects metrics via UDP and stores them in Mongo.  It comes with a modern UI that allows you to view graphs and create dashboards of these statistics.  Mouth is very similar to [StatsD](https://github.com/etsy/statsd) + [Graphite](http://graphite.wikidot.com/) + [Graphene](http://jondot.github.com/graphene/).

![Mouth Screenshot](http://cypriss.github.com/mouth/images/ss/mouth-screenshot1.png)

## Why

Why duplicate effort of the excellent StatsD / Graphite packages?  I wanted a graphing and monitoring tool that offered:

* **Accessible data**.  Because the metrics are stored in Mongo, they are very accessible to any scripts you want to write to read and act on your data.
* **Easy installation**.  Mouth depends on just Ruby and Mongo, both incredibly easy to install.
* **Modern, friendly UI**.  Mouth graphs are beautiful and easy to work with.  Exploring data and building dashboards are a joy.

## Kinds of Metrics

There are two kinds of metrics currently: counters and timers.  Both are stored in a time series with minute granularity.

* **Counters**:
  * How many occurrences of something happen per minute?
  * Can be sampled
  * Standard usage: Mouth.increment("myapp.happenings")
  * Advanced usage: Mouth.increment("myapp.happenings", 1, 0.1) # 1/10 sample rate.  UDP packets are sent 1 in 10 times, but count for 1 * 10 each.
  * Gives you a time series of happenings by minute: {"myapp.happenings" => [1, 2, 5, 20, ...]}
* **Timers**:
  * How long does something take?
  * Standard usage: Mouth.measure("myapp.occurrences", 3.3) # This occurrence took 3.3 ms to occur
  * Standard usage 2: Mouth.measure("myapp.occurrences") { do_occurance() }
  * Gives you a time series of occurrence timings by minute: {"myapp.happenings" => [1, 2, 5, 20, ...]}
* **Gauges**:
  * Record the value of something at a specific time
  * Standard usage: Mouth.gauge("myapp.subscriber_count", 3000) # At this time, you have 3000 subscribers.

## Installation on OSX

Install mouth:

    gem install mouth

Install MongoDB if you haven't:

    brew install mongodb

Start collector:

    mouth

Start web UI:

    mouth-endoscope

Record a metric:

    ruby -e 'require "mouth"; require "mouth/instrument"; Mouth.increment("gorets")'

To load the web UI, go to http://0.0.0.0:5678/ (or whatever port got chosen -- see the Terminal).  Click 'Add Graph' in the lower right-hand corner.

## Installation in Production

You'll want to follow the general gist of what you did for OSX, but make sure to specify your hosts, ports, and log locations.
NOTE: there is no config file -- all options are via command-line.

    sudo gem install mouth
    mouth --pidfile /path/to/log/mouth.pid --logfile /path/to/log/mouth.log -H x.x.x.x -P 8889 --mongohost y.y.y.y --verbosity 1
    mouth-endoscope --mongohost x.x.x.x

## Instrumenting Your Application to Record Metrics

There are many ways to instrument your application:

### Using the mouth gem

Mouth comes with a built-in facility to instrument your apps:
    
    require 'mouth'
    require 'mouth/instrument'
    
    Mouth.server = "0.0.0.0:8889"
    Mouth.increment('hello.world')
    Mouth.measure('hello.happening', 42.9)
    
### Using mouth-instrument
  
mouth-instrument is a lightweight gem that doesn't have the baggage of the various gems that come with mouth. Its usage is nearly identical:
    
    gem install mouth-instrument

    require 'mouth-instrument'
    
    Mouth.server = "0.0.0.0:8889"
    Mouth.increment('hello.world')
    Mouth.measure('hello.happening', 42.9)
    
### Using any StatsD instrumentation
  
Mouth is StatsD compatible -- if you've instrumented your application to record StatsD metrics, it should work on Mouth.  Just replace your StatsD server with a mouth process.

## Accessing Your Data Via Scripts

You can access and act on your metrics quite easily.

    require 'mouth'
    require 'mouth/sequence_query'
    
    Mouth::SequenceQuery.new("exceptions.app", :kind => :counter).sequence
    # => [4, 9, 0, ...]
    
    Mouth::SequenceQuery.new("app.requests", :kind => :timer, :granularity_in_minutes => 15, :start_time => Time.now - 86400, :end_time => Time.now).sequence
    # => [{:count => 3, :min => 1, :max => 30, :mean => 17.0, :sum => 51.0, :median => 20, :stddev => 12.02}, ...]

Additionally, you can insert metrics directly into the Mongo store, without sending UDP packets.  You might want to do this if you need guarantees UDP can't provide.

    require 'mouth'
    require 'mouth/recorder'
    
    Mouth::Recorder.increment("app.happening")
    Mouth::Recorder.gauge("app.level", 10)
    # Mouth::Recorder.measure("app.occurrence") { occur! } # Currently unsupported

## Tech

* **Ruby** - 1.9.2+ is required.  Ruby was chosen because many Ruby shops already have it deployed as part of their infrastructure.  By putting everything in Ruby, node + python aren't needed.
* **MongoDB** -  Mouth stores metrics in Mongo.  Mongo was chosen for 3 reasons:
  * It's very easy to install and get going
  * It has drivers for everything, so getting at your data is super easy
  * It's schemaless design is fairly good for storing time series metrics.
* **EventMachine** - Mouth is powered by EM, the Ruby way of doing nonblocking IO.
* **Sinatra** - The web UI is served with a simple Sinatra app.
* **Backbone.js** - The web UI is powered by Backbone.js
* **D3.js** - The graphs are powered by D3.js

## Contributing

You're interested in contributing to Mouth? *AWESOME*. Both bug reports and pull requests are welcome!

Fork Mouth from here: http://github.com/cypriss/mouth

1. Clone your fork
2. Hack away
3. If you are adding new functionality, document it in the README
4. If necessary, rebase your commits into logical chunks, without errors
5. Push the branch up to GitHub
6. Send a pull request to the cypriss/mouth project.

## Thanks

Thanks to [UserVoice.com](http://developer.uservoice.com) for sponsoring this project.  Thanks to the [StatsD](https://github.com/etsy/statsd) project for massive inspiration.  Other contributors: https://github.com/cypriss/mouth/graphs/contributors
