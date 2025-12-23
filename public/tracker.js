(function() {
  var endpoint = 'https://analytics-dashboard-swart-eight.vercel.app/api/track';
  
  var data = {
    domain: location.hostname,
    urlPath: location.pathname,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height
  };
  
  var xhr = new XMLHttpRequest();
  xhr.open('POST', endpoint);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.withCredentials = true;
  xhr.send(JSON.stringify(data));
})();