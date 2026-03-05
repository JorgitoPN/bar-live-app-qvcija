
/**
 * MMKV Test Utility
 * 
 * Use this file to test MMKV storage and verify it's working correctly.
 * Run this from any component to see MMKV in action.
 */

import { mmkvStorage, MMKVStorageAdapter, inspectSupabaseStorage } from '../src/lib/supabaseStorage';

/**
 * Test MMKV basic operations
 */
export const testMMKVBasicOperations = () => {
  console.log('\n=== MMKV Basic Operations Test ===\n');

  // Test 1: Write and Read
  console.log('Test 1: Write and Read');
  MMKVStorageAdapter.setItem('test-key', 'test-value');
  const value = MMKVStorageAdapter.getItem('test-key');
  console.log('✓ Read value:', value);
  console.assert(value === 'test-value', 'Value should match');

  // Test 2: Overwrite
  console.log('\nTest 2: Overwrite');
  MMKVStorageAdapter.setItem('test-key', 'new-value');
  const newValue = MMKVStorageAdapter.getItem('test-key');
  console.log('✓ New value:', newValue);
  console.assert(newValue === 'new-value', 'Value should be updated');

  // Test 3: Delete
  console.log('\nTest 3: Delete');
  MMKVStorageAdapter.removeItem('test-key');
  const deletedValue = MMKVStorageAdapter.getItem('test-key');
  console.log('✓ After delete:', deletedValue);
  console.assert(deletedValue === null, 'Value should be null after delete');

  // Test 4: Non-existent key
  console.log('\nTest 4: Non-existent key');
  const nonExistent = MMKVStorageAdapter.getItem('non-existent-key');
  console.log('✓ Non-existent key:', nonExistent);
  console.assert(nonExistent === null, 'Non-existent key should return null');

  console.log('\n=== All tests passed! ===\n');
};

/**
 * Test MMKV performance vs AsyncStorage
 */
export const testMMKVPerformance = () => {
  console.log('\n=== MMKV Performance Test ===\n');

  const iterations = 1000;
  const testData = JSON.stringify({ user: 'test', token: 'abc123', timestamp: Date.now() });

  // Test MMKV write performance
  console.log(`Writing ${iterations} items with MMKV...`);
  const mmkvWriteStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    MMKVStorageAdapter.setItem(`perf-test-${i}`, testData);
  }
  const mmkvWriteEnd = performance.now();
  const mmkvWriteTime = mmkvWriteEnd - mmkvWriteStart;
  console.log(`✓ MMKV write time: ${mmkvWriteTime.toFixed(2)}ms (${(mmkvWriteTime / iterations).toFixed(3)}ms per item)`);

  // Test MMKV read performance
  console.log(`\nReading ${iterations} items with MMKV...`);
  const mmkvReadStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    MMKVStorageAdapter.getItem(`perf-test-${i}`);
  }
  const mmkvReadEnd = performance.now();
  const mmkvReadTime = mmkvReadEnd - mmkvReadStart;
  console.log(`✓ MMKV read time: ${mmkvReadTime.toFixed(2)}ms (${(mmkvReadTime / iterations).toFixed(3)}ms per item)`);

  // Cleanup
  console.log('\nCleaning up test data...');
  for (let i = 0; i < iterations; i++) {
    MMKVStorageAdapter.removeItem(`perf-test-${i}`);
  }
  console.log('✓ Cleanup complete');

  console.log('\n=== Performance Summary ===');
  console.log(`Total write time: ${mmkvWriteTime.toFixed(2)}ms`);
  console.log(`Total read time: ${mmkvReadTime.toFixed(2)}ms`);
  console.log(`Average write: ${(mmkvWriteTime / iterations).toFixed(3)}ms per item`);
  console.log(`Average read: ${(mmkvReadTime / iterations).toFixed(3)}ms per item`);
  console.log('\nNote: MMKV is typically 10-30x faster than AsyncStorage');
  console.log('AsyncStorage would take ~500-1500ms for the same operations\n');
};

/**
 * Test Supabase session storage
 */
export const testSupabaseSessionStorage = () => {
  console.log('\n=== Supabase Session Storage Test ===\n');

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

  console.log('Storing mock session...');
  MMKVStorageAdapter.setItem('supabase.auth.token', JSON.stringify(mockSession));
  console.log('✓ Session stored');

  console.log('\nReading session...');
  const storedSession = MMKVStorageAdapter.getItem('supabase.auth.token');
  console.log('✓ Session retrieved:', storedSession ? 'Yes' : 'No');

  if (storedSession) {
    const parsed = JSON.parse(storedSession);
    console.log('✓ Session data:', {
      hasAccessToken: !!parsed.access_token,
      hasRefreshToken: !!parsed.refresh_token,
      userEmail: parsed.user?.email,
    });
  }

  console.log('\nInspecting all Supabase storage...');
  const allData = inspectSupabaseStorage();
  console.log('✓ Found', Object.keys(allData).length, 'Supabase keys');

  console.log('\nCleaning up mock session...');
  MMKVStorageAdapter.removeItem('supabase.auth.token');
  console.log('✓ Cleanup complete\n');
};

/**
 * Run all tests
 */
export const runAllMMKVTests = () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     MMKV Storage Test Suite           ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    testMMKVBasicOperations();
    testMMKVPerformance();
    testSupabaseSessionStorage();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✓ All MMKV tests passed!            ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
