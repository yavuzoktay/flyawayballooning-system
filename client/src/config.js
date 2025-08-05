// Dynamic Configuration based on environment
const getApiBaseUrl = () => {
  // Check if we're in development (localhost)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3002';
  }
  // Production environment
  return process.env.REACT_APP_API_URL || 'https://flyawayballooning-system.com';
};

const config = {
  API_BASE_URL: getApiBaseUrl(),
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_live_51HjVLCHwUKMuFjtpYqU29dM4gqkLTiwG2zsgCtSfRe2Ehj44Ewpd3UpRAb3lc8PiOsKwGsIcOSD7XR6FmaVaoHHK00AcQ8TPsF'
};

export default config; 