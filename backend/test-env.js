#!/usr/bin/env node

/**
 * Quick script to test if .env file is being loaded correctly
 * Run with: node test-env.js
 */

require('dotenv').config();

const maskKey = (key) => {
  if (!key) return '❌ NOT_SET';
  if (key.length < 8) return `⚠️  TOO_SHORT (${key.length} chars)`;
  return `✅ ${key.substring(0, 4)}...${key.substring(key.length - 4)} (${key.length} chars)`;
};

console.log('\n🔍 Environment Variables Check\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\nBasic Config:');
console.log('  PORT:', process.env.PORT || '❌ NOT_SET (will use default 3001)');
console.log('  NODE_ENV:', process.env.NODE_ENV || '❌ NOT_SET (will use default development)');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT_SET (will use default)');

console.log('\nAPI Keys:');
console.log('  LOGAINM_API_KEY:', maskKey(process.env.LOGAINM_API_KEY));
console.log('  GEOGRAPH_API_KEY:', maskKey(process.env.GEOGRAPH_API_KEY));
console.log('  GRAPHHOPPER_API_KEY:', maskKey(process.env.GRAPHHOPPER_API_KEY));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check for common issues
const issues = [];

if (!process.env.LOGAINM_API_KEY) {
  issues.push('⚠️  LOGAINM_API_KEY is not set');
}
if (!process.env.GEOGRAPH_API_KEY) {
  issues.push('⚠️  GEOGRAPH_API_KEY is not set');
}
if (!process.env.GRAPHHOPPER_API_KEY) {
  issues.push('⚠️  GRAPHHOPPER_API_KEY is not set');
}

// Check for spaces in keys
['LOGAINM_API_KEY', 'GEOGRAPH_API_KEY', 'GRAPHHOPPER_API_KEY'].forEach(key => {
  const value = process.env[key];
  if (value && (value.startsWith(' ') || value.endsWith(' '))) {
    issues.push(`⚠️  ${key} has leading or trailing spaces`);
  }
});

if (issues.length > 0) {
  console.log('\n⚠️  Issues Found:\n');
  issues.forEach(issue => console.log('  ' + issue));
  console.log('\n');
  process.exit(1);
} else {
  console.log('\n✅ All API keys are configured!\n');
  process.exit(0);
}
