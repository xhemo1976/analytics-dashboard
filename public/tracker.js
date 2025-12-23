(function() {
  var data = {
    d: location.hostname,
    p: location.pathname,
    r: document.referrer,
    sw: screen.width,
    sh: screen.height
  };
  
  var params = Object.keys(data).map(function(k) {
    return k + '=' + encodeURIComponent(data[k] || '');
  }).join('&');
  
  new Image().src = '/api/pixel?' + params;
})();