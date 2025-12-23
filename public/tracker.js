(function() {
  const endpoint = 'https://analytics-dashboard-swart-eight.vercel.app/api/track';
  
  let sessionId = sessionStorage.getItem('_analytics_session');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('_analytics_session', sessionId);
  }
  
  const isNewVisitor = !localStorage.getItem('_analytics_visitor');
  if (isNewVisitor) {
    localStorage.setItem('_analytics_visitor', 'true');
  }
  
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }
  
  function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return { name: 'Firefox', version: ua.match(/Firefox\/(\d+)/)?.[1] };
    if (ua.includes('Edg')) return { name: 'Edge', version: ua.match(/Edg\/(\d+)/)?.[1] };
    if (ua.includes('Chrome')) return { name: 'Chrome', version: ua.match(/Chrome\/(\d+)/)?.[1] };
    if (ua.includes('Safari')) return { name: 'Safari', version: ua.match(/Version\/(\d+)/)?.[1] };
    if (ua.includes('Opera')) return { name: 'Opera', version: ua.match(/Opera\/(\d+)/)?.[1] };
    return { name: 'Unknown', version: null };
  }
  
  function getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows NT 10')) return 'Windows 10';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Linux') && ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }
  
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign')
    };
  }
  
  function getSourceFromReferrer(referrer) {
    if (!referrer) return null;
    if (referrer.includes('google')) return 'Google';
    if (referrer.includes('bing')) return 'Bing';
    if (referrer.includes('facebook') || referrer.includes('fb.com')) return 'Facebook';
    if (referrer.includes('instagram')) return 'Instagram';
    if (referrer.includes('tiktok')) return 'TikTok';
    if (referrer.includes('twitter') || referrer.includes('x.com')) return 'Twitter/X';
    if (referrer.includes('linkedin')) return 'LinkedIn';
    if (referrer.includes('youtube')) return 'YouTube';
    if (referrer.includes('pinterest')) return 'Pinterest';
    if (referrer.includes('reddit')) return 'Reddit';
    return null;
  }
  
  const browser = getBrowser();
  const utm = getUTMParams();
  const socialSource = getSourceFromReferrer(document.referrer);
  
  const data = {
    domain: window.location.hostname,
    urlPath: window.location.pathname,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    deviceType: getDeviceType(),
    browser: browser.name,
    browserVersion: browser.version,
    os: getOS(),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    source: utm.source || socialSource,
    medium: utm.medium,
    campaign: utm.campaign,
    sessionId: sessionId,
    isNewVisitor: isNewVisitor
  };
  
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    mode: 'cors',
    credentials: 'omit'
  }).catch(function() {});
})();