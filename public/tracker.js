(function() {
  var endpoint = 'https://analytics-dashboard-swart-eight.vercel.app/api/track';

  // Hilfsfunktion: URL Parameter auslesen (für UTM Tracking)
  function getParam(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }

  // Hilfsfunktion: Einfache Session ID (optional, im SessionStorage speichern)
  function getSessionId() {
    var key = 'analytics_session_id';
    var sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getBrowser() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Opera') > -1) return 'Opera';
    return 'Unknown';
  }

  function getOS() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Windows') > -1) return 'Windows';
    if (ua.indexOf('Mac OS') > -1) return 'macOS';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    return 'Unknown';
  }

  var data = {
    domain: location.hostname,
    urlPath: location.pathname,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    deviceType: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screenWidth: screen.width,
    screenHeight: screen.height,
    // Neue Felder für dein Prisma Schema:
    source: getParam('utm_source'),
    medium: getParam('utm_medium'),
    campaign: getParam('utm_campaign'),
    sessionId: getSessionId()
  };

  // Modernes Senden: sendBeacon (funktioniert auch beim Tab-Schließen!)
  if (navigator.sendBeacon) {
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } else {
    // Fallback für sehr alte Browser
    var xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  }
})();