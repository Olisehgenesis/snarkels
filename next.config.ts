import type { NextConfig } from "next";

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  env: {
    PORT: '4000'
  },
  
  // Enable Turbopack for faster development builds
  turbopack: {
    // Configure module resolution for better performance
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    
    // Configure aliases for cleaner imports and better performance
    resolveAlias: {
      '@': './',
      '@/components': './components',
      '@/hooks': './hooks',
      '@/lib': './lib',
      '@/context': './context',
      '@/app': './app',
      
      // Conditional aliases for better browser optimization
      'react': { browser: 'react' },
      'react-dom': { browser: 'react-dom' },
      
      // Performance optimizations for common libraries
      'lodash': 'lodash-es',
    },
  },
  
  // Optimized webpack configuration for production builds
  webpack: (config, { isServer, dev }) => {
    // Keep existing externals
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Disable source maps in production to reduce memory usage
    if (!dev) {
      config.devtool = false;
    }
    
    if (!isServer && !dev) {
      // Check if we're on a low-memory server (less than 4GB)
      const isLowMemoryServer = process.env.NODE_ENV === 'production' && 
        (process.env.MEMORY_LIMIT === 'low' || process.env.SERVER_ENV === 'production');
      
      if (isLowMemoryServer) {
        // Ultra-minimal chunking for low-memory servers
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            // Only split React into separate chunk
            'react-vendor': {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 20,
            },
            // Everything else goes into vendor
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
          // Very conservative memory settings for low-memory servers
          maxSize: 5000000, // 5MB - larger chunks = less memory pressure
          minSize: 200000, // 200KB minimum
          maxAsyncRequests: 5, // Very low limit
          maxInitialRequests: 3, // Very low limit
        }
      } else {
        // Standard chunking for higher-memory environments
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            // React chunk
            'react-vendor': {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 20,
            },
            // Blockchain libraries chunk
            'blockchain-vendor': {
              test: /[\\/]node_modules[\\/](wagmi|@wagmi|viem|@tanstack)[\\/]/,
              name: 'blockchain-vendor',
              chunks: 'all',
              priority: 15,
            },
            // General vendor chunk (includes everything else)
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
          // Increase chunk size limit to reduce memory pressure
          maxSize: 3000000, // 3MB in bytes
          // Memory-friendly options
          minSize: 100000, // 100KB minimum chunk size
          maxAsyncRequests: 10, // Limit concurrent async chunks
          maxInitialRequests: 6, // Limit initial chunks
        }
      }
    }
    
    return config;
  },
  
  // Additional optimizations for development and production
  experimental: {
    // Enable React compiler for better performance
    reactCompiler: true,
    
    // Enable server components HMR cache for better performance
    serverComponentsHmrCache: true,
    
    // Note: forceSwcTransforms removed to be compatible with Turbopack
    // forceSwcTransforms: true,
  },
  
  // Performance optimizations
  compress: true,
  
  // Enable production source maps for debugging
  productionBrowserSourceMaps: false,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
};

export default withBundleAnalyzer(nextConfig);
