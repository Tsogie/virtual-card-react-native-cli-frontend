/**
 * Application Configuration
 *
 * Centralized configuration for API endpoints and app settings.
 * Update the BASE_URL to match your backend server.
 */

export const Config = {
  /**
   * Backend API base URL
   * - Development: Use your local network IP (e.g., 'http://192.168.1.100:3000')
   * - Production: Use your production API URL
   */
  BASE_URL: 'http://172.20.10.13:3000',

  /**
   * API Endpoints
   */
  API: {
    LOGIN: '/api/login',
    DEVICE_REGISTER: '/api/device/register',
    USER_INFO: '/api/userinfo',
    WALLET_REDEEM: '/api/wallet/redeem',
    TOPUP: '/api/wallet/topup/',
    TRANSACTIONS: '/api/transactions',
  },

  /**
   * App Settings
   */
  NETWORK_TIMEOUT: 5000, // milliseconds
  RETRY_DELAY: 2000, // milliseconds
};

export default Config;
