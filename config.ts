/**
 * Application Configuration
 */

export const Config = {

  //BASE_URL: 'http://172.20.10.13:3000',
  BASE_URL: 'https://virtual-card-spring-boot-backend.onrender.com',

  /**
   * API Endpoints
   */
  API: {
    LOGIN: '/api/login',
    DEVICE_REGISTER: '/api/device/register',
    USER_REGISTER: '/api/register',
    USER_INFO: '/api/userinfo',
    WALLET_REDEEM: '/api/wallet/redeem',
    TOPUP: '/api/wallet/topup',
    TRANSACTIONS: '/api/transactions',
  },

  /**
   * App Settings
   */
  NETWORK_TIMEOUT: 5000, // milliseconds
  RETRY_DELAY: 2000, // milliseconds
};

export default Config;
