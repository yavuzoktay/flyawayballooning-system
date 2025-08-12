// Dynamic Configuration based on environment
const getApiBaseUrl = () => {
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }
  // Production environment
  return process.env.REACT_APP_API_URL || 'https://flyawayballooning-system.com';
};

// Use the complete publishable key from the same account as the secret key
const TEST_PK = 'pk_test_51HjVLCHwUKMuFjtpkabkDGYDbjlEYMKZxLtmVrRxWNSJofcJuVeUKu4NNy0EvDN50DC4cfqf43X1x40BVThLCTRI0007TlISlC';
const envPk = typeof process !== 'undefined' ? process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY : undefined;
const resolvedPk = envPk && envPk.startsWith('pk_') ? envPk : TEST_PK;

const config = {
  API_BASE_URL: getApiBaseUrl(),
  STRIPE_PUBLIC_KEY: resolvedPk
};

export default config; 