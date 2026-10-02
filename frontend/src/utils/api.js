// Centralized API configuration and resilient fetch utilities for Aethra Vision Core

export const IS_SECURE_CLOUD = typeof window !== 'undefined' && window.location.protocol === 'https:' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

// Live Render Cloud Backend Endpoint
export const PRODUCTION_RENDER_BACKEND = 'https://aethra-vision-backend.onrender.com';

// Determine Base URLs (auto-points to Render backend in cloud, or localhost when developing locally)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (IS_SECURE_CLOUD ? PRODUCTION_RENDER_BACKEND : 'http://127.0.0.1:8000');
export const AI_URL = import.meta.env.VITE_AI_URL || (IS_SECURE_CLOUD ? PRODUCTION_RENDER_BACKEND : 'http://127.0.0.1:8002');

export const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (IS_SECURE_CLOUD) {
    // In HTTPS cloud environment, connect to secure Render WebSocket
    return 'wss://aethra-vision-backend.onrender.com/ws/alerts';
  }
  return 'ws://127.0.0.1:8000/ws/alerts';
};

// Resilient fetch wrapper with AbortController timeout to prevent browser hanging/stalling
export async function safeFetch(url, options = {}, timeoutMs = 2500) {
  // If running on HTTPS (Vercel) and trying to access insecure localhost, immediately reject to prevent browser hanging
  if (IS_SECURE_CLOUD && (url.includes('127.0.0.1') || url.includes('localhost')) && url.startsWith('http://')) {
    throw new Error('Mixed-content blocked: Localhost HTTP cannot be accessed directly from HTTPS Cloud.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
