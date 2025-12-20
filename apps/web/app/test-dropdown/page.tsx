'use client';

import React from 'react';
import { HomeownerProfileDropdown } from '@/components/profile/HomeownerProfileDropdown';

export default function TestDropdownPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1E293B',
      padding: '50px'
    }}>
      <h1 style={{ color: 'white', marginBottom: '30px' }}>
        Profile Dropdown Test Page
      </h1>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: '#1E293B',
        padding: '20px',
        border: '1px solid #14B8A6',
        borderRadius: '8px'
      }}>
        <HomeownerProfileDropdown
          userName="John Doe"
          initials="JD"
          profileImageUrl={null}
        />
      </div>

      <div style={{
        marginTop: '50px',
        padding: '20px',
        backgroundColor: '#2D3748',
        borderRadius: '8px',
        color: 'white'
      }}>
        <h2 style={{ marginBottom: '10px' }}>Testing Instructions:</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>Click on the profile button (with JD initials)</li>
          <li>The dropdown menu should appear</li>
          <li>You should see profile settings and quick links</li>
          <li>Click on any menu item to navigate</li>
          <li>Click outside to close the dropdown</li>
          <li>Press Escape key to close the dropdown</li>
        </ol>

        <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Expected Features:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>✅ Navy Blue (#1E293B) background</li>
          <li>✅ Teal (#14B8A6) accent color for avatar</li>
          <li>✅ Profile Settings link</li>
          <li>✅ Quick links to Jobs, Properties, Messages, Payments</li>
          <li>✅ Help & Support link</li>
          <li>✅ Logout button</li>
          <li>✅ Responsive hover states</li>
          <li>✅ Proper z-index (dropdown appears on top)</li>
        </ul>

        <div style={{ marginTop: '20px' }}>
          <strong>Console Logs:</strong> Open DevTools to see click event logs
        </div>
      </div>
    </div>
  );
}