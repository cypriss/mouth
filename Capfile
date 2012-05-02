load 'deploy'

# Simply way to deploy the app if you're developing it
# I will probably remove this file later.
set :application, "mouth"
default_run_options[:pty] = true 

set :scm, :none
role :app, "sugar"

task :omg do
  res = `gem build mouth.gemspec`
  if res =~ /Success/
    home = "#{capture('pwd').strip}/mouth"
    file = res.match(/File: (.+)$/)[1]
    run "mkdir -p ~/mouth"
    loc = "#{home}/#{file}"
    upload file, loc
    sudo "gem install #{loc}"
    run "rm #{loc}"
    run "mouth-endoscope -K"
    run "mouth --pidfile #{home}/mouth.pid -K"
    run "sleep 5"
    run "mouth-endoscope --mongohost 10.36.103.70"
    run "mouth --pidfile #{home}/mouth.pid --logfile #{home}/mouth.log -H 10.18.23.135 -P 8889 --mongohost 10.36.103.70"
  end
end
