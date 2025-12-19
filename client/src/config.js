// Dynamic Configuration based on environment
const getApiBaseUrl = () => {
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }
  // Production environment - always use production URL for live site
  return 'https://flyawayballooning-system.com';
};

// Use the complete publishable key from the same account as the secret key
const TEST_PK = 'pk_live_51HjVLCHwUKMuFjtpYqU29dM4gqkLTiwG2zsgCtSfRe2Ehj44Ewpd3UpRAb3lc8PiOsKwGsIcOSD7XR6FmaVaoHHK00AcQ8TPsF';

const config = {
  API_BASE_URL: getApiBaseUrl(),
  STRIPE_PUBLIC_KEY: TEST_PK
};

export default config; 