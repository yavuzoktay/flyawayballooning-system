// Production Configuration
const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://flyawayballooning-system.com',
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_live_51HjVLCHwUKMuFjtpYqU29dM4gqkLTiwG2zsgCtSfRe2Ehj44Ewpd3UpRAb3lc8PiOsKwGsIcOSD7XR6FmaVaoHHK00AcQ8TPsF' // Stripe public key'inizi buraya ekleyin
};

export default config; 