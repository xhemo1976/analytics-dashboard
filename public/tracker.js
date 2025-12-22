(function() {
  const endpoint = 'https://analytics-dashboard-swart-eight.vercel.app/api/track';
  
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: window.location.hostname,
      urlPath: window.location.pathname,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent
    })
  });
})();
