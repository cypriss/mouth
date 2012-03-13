# Mouth

Ruby daemon that collects stats via UDP and stores them in Mongo.


sudo gem install mouth

mouth --pidfile /home/dev/mouth.pid --logfile /home/dev/mouth.log -H x.x.x.x -P 8889 --mongohost y.y.y.y --verbosity 2

mouth-endoscope --mongohost x.x.x.x


Getting started on your OSX:

  Make sure mongo is installed and running:

    brew install mongo
  
  Install mouth
  
    gem install mouth
  
  Start collector daemon:
  
    mouth
  
  Start web UI:
  
    mouth-endoscope
    
  
