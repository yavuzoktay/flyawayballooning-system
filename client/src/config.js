// Dynamic Configuration based on environment
const getApiBaseUrl = () => {
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }
  // Production environment - always use production URL for live site
  return 'https://flyawayballooning-system.com';
};

// Stripe publishable keys
// - TEST_PK: for localhost / test mode
// - LIVE_PK: for production (must be set via environment variable at build time)
const TEST_PK = 'pk_live_51HjVLCHwUKMuFjtpYqU29dM4gqkLTiwG2zsgCtSfRe2Ehj44Ewpd3UpRAb3lc8PiOsKwGsIcOSD7XR6FmaVaoHHK00AcQ8TPsF';

const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const livePk = typeof process !== 'undefined'
  ? (process.env.REACT_APP_STRIPE_LIVE_PUBLISHABLE_KEY || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : undefined;

const resolvedPk = isLocalhost
  ? TEST_PK
  : (livePk && livePk.startsWith('pk_') ? livePk : TEST_PK);

const config = {
  API_BASE_URL: getApiBaseUrl(),
  STRIPE_PUBLIC_KEY: resolvedPk
};

export default config;