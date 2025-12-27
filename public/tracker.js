(function() {
  var data = {
    d: location.hostname,
    p: location.pathname,
    r: document.referrer || null,
    sw: screen.width,
    sh: screen.height,
    ua: navigator.userAgent,
    // Geo-Daten werden unten hinzugefügt
    country: null,
    countryCode: null,
    city: null,
    region: null
  };

  var endpoint = '/api/track';
  var sent = false;

  function sendData() {
    if (sent) return;
    sent = true;

    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(data));
    }
  }

  // Timeout: Sende nach 2 Sekunden auch ohne Geo-Daten
  var geoTimeout = setTimeout(function() {
    console.log('[Tracker] Timeout - sending without geo');
    sendData();
  }, 2000);

  // NEUE LÖSUNG: Geo-Daten direkt im Browser holen!
  // Das umgeht alle Server-IP-Probleme komplett.
  fetch('http://ip-api.com/json/?fields=status,country,countryCode,city,regionName')
    .then(function(response) { return response.json(); })
    .then(function(geo) {
      clearTimeout(geoTimeout);
      if (geo && geo.status === 'success') {
        data.country = geo.country;
        data.countryCode = geo.countryCode;
        data.city = geo.city;
        data.region = geo.regionName;
        console.log('[Tracker] Geo OK:', geo.city, geo.country);
      }
      sendData();
    })
    .catch(function(err) {
      console.log('[Tracker] Geo failed, trying backup...');
      // Backup: ipapi.co
      fetch('https://ipapi.co/json/')
        .then(function(response) { return response.json(); })
        .then(function(geo) {
          clearTimeout(geoTimeout);
          if (geo && geo.city) {
            data.country = geo.country_name;
            data.countryCode = geo.country_code;
            data.city = geo.city;
            data.region = geo.region;
            console.log('[Tracker] Backup Geo OK:', geo.city);
          }
          sendData();
        })
        .catch(function() {
          clearTimeout(geoTimeout);
          sendData();
        });
    });
})();
