#!/usr/bin/env node

/**
 * Test script to verify Turbopack configuration
 * Run with: node scripts/test-turbopack.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Enhanced Turbopack Configuration...\n');

// Check if next.config.ts exists and has turbopack config
const configPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(configPath)) {
  console.log('✅ next.config.ts found');
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  if (configContent.includes('turbopack:')) {
    console.log('✅ Turbopack configuration found');
    
    // Check for specific optimizations
    if (configContent.includes('resolveAlias')) {
      console.log('✅ Path aliases configured');
    }
    
    if (configContent.includes('optimizePackageImports')) {
      console.log('✅ Package import optimization enabled');
    }
    
    if (configContent.includes('reactCompiler: true')) {
      console.log('✅ React compiler enabled');
    }
    
    if (configContent.includes('serverComponentsHmrCache: true')) {
      console.log('✅ Server components HMR cache enabled');
    }
    
    if (configContent.includes('compress: true')) {
      console.log('✅ Compression enabled');
    }
    
    if (configContent.includes('images:')) {
      console.log('✅ Image optimization configured');
    }
  } else {
    console.log('❌ Turbopack configuration missing');
  }
} else {
  console.log('❌ next.config.ts not found');
}

// Check package.json scripts
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  if (scripts.dev && scripts.dev.includes('--turbopack')) {
    console.log('✅ Dev script includes --turbopack flag');
  } else {
    console.log('❌ Dev script missing --turbopack flag');
  }
  
  if (scripts['dev:next'] && scripts['dev:next'].includes('--turbopack')) {
    console.log('✅ dev:next script includes --turbopack flag');
  } else {
    console.log('❌ dev:next script missing --turbopack flag');
  }
} else {
  console.log('❌ package.json not found');
}

// Check TypeScript configuration
const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsConfigPath)) {
  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  const paths = tsConfig.compilerOptions?.paths || {};
  
  if (paths['@/*']) {
    console.log('✅ TypeScript path mapping configured (@/*)');
  } else {
    console.log('❌ TypeScript path mapping missing');
  }
} else {
  console.log('❌ tsconfig.json not found');
}

// Check for performance packages
const dependencies = packageJson?.dependencies || {};
const devDependencies = packageJson?.devDependencies || {};
const allDeps = { ...dependencies, ...devDependencies };

if (allDeps['next'] && allDeps['next'].startsWith('15')) {
  console.log('✅ Next.js 15.x detected (Turbopack ready)');
} else {
  console.log('⚠️  Next.js version may not support all Turbopack features');
}

console.log('\n🚀 To start development with Turbopack:');
console.log('   pnpm dev');
console.log('   pnpm dev:next');
console.log('\n📊 Performance Features Enabled:');
console.log('   • Fast module resolution with aliases');
console.log('   • Package import optimization');
console.log('   • React compiler for better performance');
console.log('   • Server components HMR cache');
console.log('   • Image format optimization');
console.log('   • Compression for production builds');
console.log('\n📚 For more info, see: https://nextjs.org/docs/app/building-your-application/routing/colocation');
