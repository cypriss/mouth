// Me function for linenizing the background
$(function() {
  // temporary substitute for parameters:
  var el = document.getElementById('current-dashboard');
  
  
  var canvas   = document.createElement('canvas');
  var context  = canvas.getContext('2d');
  var x = parseInt(getStyle(el, 'width')), y = parseInt(getStyle(el, 'height'));
  var hue = 0;
  
  canvas.width = x;
  canvas.height = y;
  
  context.lineWidth = 0.25;
  context.strokeStyle = 'hsla(0,0%,16%,1)';
  
  var grad = context.createLinearGradient(0, 0, x, 0);
  grad.addColorStop(0, 'hsla(0,0%,10%,1)');
  grad.addColorStop(0.5, 'hsla(0,0%,13%,1)');
  grad.addColorStop(1, 'hsla(0,0%,10%,1)');
  context.fillStyle = grad;
  context.fillRect(0, 0, x, y);
  
  for (var i = 0; i <= x; i++) {
    for (var j = 0; j <= y; j++) {        
      if (Math.round(Math.random() * 30) === 30) {
        context.moveTo(i, j + 0.5);
        context.lineTo(i + (Math.ceil(Math.random() * 200)), j + 0.5);
      } 
  
      if (Math.round(Math.random() * 30) === 30) {
        context.moveTo(i + 0.5, j + 0.5);
        context.lineTo(i + 0.5, j + (Math.ceil(Math.random() * 200)));
      }
    }
  }
  
  context.stroke();
  
  el.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
  
  function getStyle(el, property) {
    return el.style[property] || getComputedStyle(el, '').getPropertyValue(property);
  }  
});