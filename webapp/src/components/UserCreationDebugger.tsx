import React, { useState } from 'react';
import { userService } from '../services/userService';

// TEMPORARY COMPONENT FOR DEBUGGING hello@hello.com ISSUE
// Add this to your app temporarily to test the bypass method

const UserCreationDebugger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testBypassMethod = async () => {
    setIsLoading(true);
    setResult('');

    try {
      console.log('🧪 Testing bypass method...');
      
      const testUserData = {
        email: 'hello@hello.com',
        name: 'Hello Test User',
        username: 'hello',
        password: 'testpassword123',
        address: '123 Test Street',
        phoneNumber: '555-0123',
        role: 'user'
      };

      console.log('🧪 Calling bypass method...');
      // @ts-ignore - we know this method exists but TS might complain
      const result = await userService.createUserBypassValidation(testUserData);
      
      console.log('🧪 Bypass method result:', result);
      setResult(`✅ SUCCESS: User created successfully! ID: ${result?.id}`);
      
    } catch (error: any) {
      console.error('🧪 Bypass method failed:', error);
      setResult(`❌ FAILED: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNormalMethod = async () => {
    setIsLoading(true);
    setResult('');

    try {
      console.log('🧪 Testing normal method...');
      
      const testUserData = {
        email: 'hello@hello.com',
        name: 'Hello Test User',
        username: 'hello',
        password: 'testpassword123',
        address: '123 Test Street',
        phoneNumber: '555-0123',
        role: 'user'
      };

      console.log('🧪 Calling normal createUser method...');
      const result = await userService.createUser(testUserData);
      
      console.log('🧪 Normal method result:', result);
      setResult(`✅ SUCCESS: User created successfully! ID: ${result?.id}`);
      
    } catch (error: any) {
      console.error('🧪 Normal method failed:', error);
      setResult(`❌ FAILED: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestUser = async () => {
    setIsLoading(true);
    setResult('');

    try {
      console.log('🧪 Clearing test user...');
      
      // You can also run this SQL manually:
      // DELETE FROM auth.users WHERE email = 'hello@hello.com';
      // DELETE FROM users WHERE email = 'hello@hello.com';
      
      setResult('🗑️ Run this in Supabase SQL Editor: DELETE FROM auth.users WHERE email = \'hello@hello.com\'; DELETE FROM users WHERE email = \'hello@hello.com\';');
      
    } catch (error: any) {
      console.error('🧪 Clear failed:', error);
      setResult(`❌ FAILED: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid orange', 
      margin: '20px',
      backgroundColor: '#fff3cd'
    }}>
      <h3>🧪 User Creation Debugger (hello@hello.com)</h3>
      <p><strong>⚠️ TEMPORARY DEBUGGING COMPONENT</strong></p>
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={testBypassMethod} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '10px', backgroundColor: '#28a745', color: 'white' }}
        >
          {isLoading ? 'Testing...' : '🚀 Test Bypass Method'}
        </button>
        
        <button 
          onClick={testNormalMethod} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '10px', backgroundColor: '#007bff', color: 'white' }}
        >
          {isLoading ? 'Testing...' : '🔍 Test Normal Method'}
        </button>
        
        <button 
          onClick={clearTestUser} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '10px', backgroundColor: '#dc3545', color: 'white' }}
        >
          {isLoading ? 'Clearing...' : '🗑️ Clear Test User'}
        </button>
      </div>
      
      {result && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: result.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.includes('SUCCESS') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{result}</pre>
        </div>
      )}
      
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>First, click "Clear Test User" to make sure hello@hello.com is clean</li>
          <li>Then try "Test Bypass Method" to see if the issue is in validation</li>
          <li>If that works, try "Test Normal Method" to see where the difference is</li>
          <li>Check browser console for detailed debug output</li>
        </ol>
      </div>
    </div>
  );
};

export default UserCreationDebugger;
