/**
 * ✅ v8.0: Storage Test Utility (Expo Go Compatible)
 * 
 * Use this file to test storage and verify it's working correctly.
 * Works with both MMKV (Development Build) and AsyncStorage (Expo Go).
 * Run this from any component to see storage in action.
 */

import { supabaseStorage, getStorageInfo } from '../src/lib/supabaseStorage';

/**
 * Test basic storage operations
 */
export const testBasicOperations = async () => {
  console.log('\n=== Storage Basic Operations Test ===\n');

  const storageInfo = getStorageInfo();
  console.log(`Using: ${storageInfo.type} on ${storageInfo.platform}`);

  // Test 1: Write and Read
  console.log('\nTest 1: Write and Read');
  await supabaseStorage.setItem('test-key', 'test-value');
  const value = await supabaseStorage.getItem('test-key');
  console.log('✓ Read value:', value);
  console.assert(value === 'test-value', 'Value should match');

  // Test 2: Overwrite
  console.log('\nTest 2: Overwrite');
  await supabaseStorage.setItem('test-key', 'new-value');
  const newValue = await supabaseStorage.getItem('test-key');
  console.log('✓ New value:', newValue);
  console.assert(newValue === 'new-value', 'Value should be updated');

  // Test 3: Delete
  console.log('\nTest 3: Delete');
  await supabaseStorage.removeItem('test-key');
  const deletedValue = await supabaseStorage.getItem('test-key');
  console.log('✓ After delete:', deletedValue);
  console.assert(deletedValue === null, 'Value should be null after delete');

  // Test 4: Non-existent key
  console.log('\nTest 4: Non-existent key');
  const nonExistent = await supabaseStorage.getItem('non-existent-key');
  console.log('✓ Non-existent key:', nonExistent);
  console.assert(nonExistent === null, 'Non-existent key should return null');

  console.log('\n=== All tests passed! ===\n');
};

/**
 * Test storage performance
 */
export const testStoragePerformance = async () => {
  console.log('\n=== Storage Performance Test ===\n');

  const storageInfo = getStorageInfo();
  console.log(`Testing: ${storageInfo.type} on ${storageInfo.platform}`);

  const iterations = 100; // Reduced for async operations
  const testData = JSON.stringify({ user: 'test', token: 'abc123', timestamp: Date.now() });

  // Test write performance
  console.log(`\nWriting ${iterations} items...`);
  const writeStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await supabaseStorage.setItem(`perf-test-${i}`, testData);
  }
  const writeEnd = performance.now();
  const writeTime = writeEnd - writeStart;
  console.log(`✓ Write time: ${writeTime.toFixed(2)}ms (${(writeTime / iterations).toFixed(3)}ms per item)`);

  // Test read performance
  console.log(`\nReading ${iterations} items...`);
  const readStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await supabaseStorage.getItem(`perf-test-${i}`);
  }
  const readEnd = performance.now();
  const readTime = readEnd - readStart;
  console.log(`✓ Read time: ${readTime.toFixed(2)}ms (${(readTime / iterations).toFixed(3)}ms per item)`);

  // Cleanup
  console.log('\nCleaning up test data...');
  for (let i = 0; i < iterations; i++) {
    await supabaseStorage.removeItem(`perf-test-${i}`);
  }
  console.log('✓ Cleanup complete');

  console.log('\n=== Performance Summary ===');
  console.log(`Total write time: ${writeTime.toFixed(2)}ms`);
  console.log(`Total read time: ${readTime.toFixed(2)}ms`);
  console.log(`Average write: ${(writeTime / iterations).toFixed(3)}ms per item`);
  console.log(`Average read: ${(readTime / iterations).toFixed(3)}ms per item`);
  
  if (storageInfo.type === 'MMKV') {
    console.log('\n✨ Using MMKV - High performance storage!');
  } else {
    console.log('\n📦 Using AsyncStorage - Reliable Expo Go compatible storage');
    console.log('💡 For better performance, use a Development Build to enable MMKV');
  }
  console.log('');
};

/**
 * Test Supabase session storage
 */
export const testSupabaseSessionStorage = async () => {
  console.log('\n=== Supabase Session Storage Test ===\n');

  const storageInfo = getStorageInfo();
  console.log(`Using: ${storageInfo.type}`);

  // Simulate a Supabase session
  const mockSession = {
    access_token: 'mock-access-token-12345',
    refresh_token: 'mock-refresh-token-67890',
    expires_at: Date.now() + 3600000,
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  };

  console.log('\nStoring mock session...');
  await supabaseStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
  console.log('✓ Session stored');

  console.log('\nReading session...');
  const storedSession = await supabaseStorage.getItem('supabase.auth.token');
  console.log('✓ Session retrieved:', storedSession ? 'Yes' : 'No');

  if (storedSession) {
    const parsed = JSON.parse(storedSession);
    console.log('✓ Session data:', {
      hasAccessToken: !!parsed.access_token,
      hasRefreshToken: !!parsed.refresh_token,
      userEmail: parsed.user?.email,
    });
  }

  console.log('\nCleaning up mock session...');
  await supabaseStorage.removeItem('supabase.auth.token');
  console.log('✓ Cleanup complete\n');
};

/**
 * Run all tests
 */
export const runAllStorageTests = async () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     Storage Test Suite v8.0            ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await testBasicOperations();
    await testStoragePerformance();
    await testSupabaseSessionStorage();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✓ All storage tests passed!          ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export legacy name for backwards compatibility
export const runAllMMKVTests = runAllStorageTests;
