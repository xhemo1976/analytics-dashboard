(function() {
  // 1. Daten sammeln
  var data = {
    d: location.hostname,
    p: location.pathname,
    r: document.referrer || null,
    sw: screen.width,
    sh: screen.height,
    ua: navigator.userAgent
  };

  var endpoint = '/api/track';
  var sent = false;

  function sendData() {
    if (sent) return;
    sent = true;

    // 2. Senden mit Beacon (Zuverlässig bei Mobile & Page Exit)
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
  }

  // Versuche IP direkt vom Client zu holen (wichtig für korrekte Geolokalisierung)
  var ipTimeout = setTimeout(function() {
    sendData(); // Sende auch ohne IP nach 1 Sekunde
  }, 1000);

  fetch('https://api.ipify.org?format=json')
    .then(function(response) { return response.json(); })
    .then(function(ipData) {
      clearTimeout(ipTimeout);
      if (ipData && ipData.ip) {
        data.ip = ipData.ip;
      }
      sendData();
    })
    .catch(function() {
      clearTimeout(ipTimeout);
      sendData(); // Sende auch wenn IP-Abruf fehlschlägt
    });
})();