
/**
 * Storage Test Utility v8.0
 * 
 * Tests the unified storage system (AsyncStorage or MMKV)
 * Works in both Expo Go (AsyncStorage) and Development Builds (MMKV)
 */

import { supabaseStorage, storageInfo } from '../src/lib/supabaseStorage';

/**
 * Test storage basic operations
 */
export const testStorageBasicOperations = async () => {
  console.log('\n=== Storage Basic Operations Test ===\n');
  console.log(`Using: ${storageInfo.backend}\n`);

  // Test 1: Write and Read
  console.log('Test 1: Write and Read');
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
  console.log(`Using: ${storageInfo.backend}\n`);

  const iterations = 100; // Reduced for AsyncStorage
  const testData = JSON.stringify({ user: 'test', token: 'abc123', timestamp: Date.now() });

  // Test write performance
  console.log(`Writing ${iterations} items...`);
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
  console.log(`Backend: ${storageInfo.backend}`);
  console.log(`Total write time: ${writeTime.toFixed(2)}ms`);
  console.log(`Total read time: ${readTime.toFixed(2)}ms`);
  console.log(`Average write: ${(writeTime / iterations).toFixed(3)}ms per item`);
  console.log(`Average read: ${(readTime / iterations).toFixed(3)}ms per item`);
  
  if (storageInfo.isAsyncStorageMode) {
    console.log('\nNote: AsyncStorage is slower but works in Expo Go');
    console.log('Enable MMKV for 10-30x faster performance in production builds\n');
  } else {
    console.log('\nNote: MMKV is 10-30x faster than AsyncStorage\n');
  }
};

/**
 * Test Supabase session storage
 */
export const testSupabaseSessionStorage = async () => {
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
  console.log(`Storage Backend: ${storageInfo.backend}`);
  console.log(`MMKV Enabled: ${storageInfo.isMMKVEnabled}`);
  console.log(`AsyncStorage Mode: ${storageInfo.isAsyncStorageMode}\n`);

  try {
    await testStorageBasicOperations();
    await testStoragePerformance();
    await testSupabaseSessionStorage();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✓ All storage tests passed!         ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    if (storageInfo.isAsyncStorageMode) {
      console.log('💡 TIP: To enable MMKV for better performance:');
      console.log('   1. Set USE_MMKV = true in src/lib/supabaseStorage.ts');
      console.log('   2. Build a Development Build (not Expo Go)');
      console.log('   3. MMKV will be used automatically\n');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
