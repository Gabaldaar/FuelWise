declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface WithPWA {
    (config: NextConfig): NextConfig;
  }
  
  interface PWAConfig {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
  }
  
  const withPWA: (config: PWAConfig) => WithPWA;
  
  export default withPWA;
}
