/*
 * Public configuration only. There is no secret in this file and there must
 * never be one: everything here ships to the browser.
 *
 * apiBase points at the Python triage service. For local work that is the
 * uvicorn default. Before deploying, change it to your free Render URL.
 */
window.TATOIQ_CONFIG = {
  apiBase: 'http://localhost:8000',
  siteName: 'TatoIQ',
};
