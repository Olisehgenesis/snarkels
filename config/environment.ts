// Environment configuration for socket and app URLs
export const getSocketUrl = () => {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001';
};

export const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
};

export const getCorsOrigins = () => {
  return [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'];
};

// Environment info
export const isServer = process.env.NEXT_PUBLIC_ENV === 'server';
export const isLocalhost = process.env.NEXT_PUBLIC_ENV !== 'server';
