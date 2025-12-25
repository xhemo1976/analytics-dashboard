(function() {
  var data = {
    d: location.hostname,
    p: location.pathname,
    r: document.referrer,
    sw: screen.width,
    sh: screen.height
  };
  
  var sent = false;
  
  function sendPixel() {
    if (sent) return; // Verhindere doppeltes Senden
    sent = true;
    
    var params = Object.keys(data).map(function(k) {
      return k + '=' + encodeURIComponent(data[k] || '');
    }).join('&');
    
    new Image().src = '/api/pixel?' + params;
  }
  
  // Versuche die IP direkt vom Client zu holen
  // Timeout nach 1 Sekunde, dann sende Request auch ohne IP
  var ipTimeout = setTimeout(function() {
    sendPixel();
  }, 1000);
  
  fetch('https://api.ipify.org?format=json')
    .then(function(response) { return response.json(); })
    .then(function(ipData) {
      clearTimeout(ipTimeout);
      if (ipData.ip) {
        data.ip = ipData.ip;
      }
      sendPixel();
    })
    .catch(function() {
      clearTimeout(ipTimeout);
      // Falls IP-Abruf fehlschlägt, sende Request ohne IP
      sendPixel();
    });
})();