(function() {
  var data = {
    d: location.hostname,
    p: location.pathname,
    r: document.referrer || null,
    sw: screen.width,
    sh: screen.height,
    ua: navigator.userAgent
  };

  var endpoint = '/api/track';

  // Senden mit Beacon (Zuverlässig bei Mobile & Page Exit)
  if (navigator.sendBeacon) {
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } else {
    // Fallback für uralte Browser
    var xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  }
})();

