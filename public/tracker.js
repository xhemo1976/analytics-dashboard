(function() {
  var endpoint = 'https://analytics-dashboard-swart-eight.vercel.app/api/track';
  
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
    screenHeight: screen.height
  };
  
  var xhr = new XMLHttpRequest();
  xhr.open('POST', endpoint, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.withCredentials = true;
  xhr.send(JSON.stringify(data));
})();