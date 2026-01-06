'use client';

import React from 'react';

/**
 * Skip Links Component for Keyboard Navigation
 * WCAG 2.1 Level A - Criterion 2.4.1: Bypass Blocks
 */
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#main-navigation" className="skip-link">
        Skip to navigation
      </a>
      <a href="#search" className="skip-link">
        Skip to search
      </a>
      <a href="#footer" className="skip-link">
        Skip to footer
      </a>

      <style jsx>{`
        .skip-links {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 9999;
        }

        .skip-link {
          position: absolute;
          top: -40px;
          left: 0;
          background: #000;
          color: #fff;
          padding: 8px 16px;
          text-decoration: none;
          border-radius: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          transition: top 0.3s;
        }

        .skip-link:focus,
        .skip-link:active {
          top: 0;
          outline: 3px solid #4f46e5;
          outline-offset: 2px;
        }

        .skip-link:nth-child(2) { left: 150px; }
        .skip-link:nth-child(3) { left: 270px; }
        .skip-link:nth-child(4) { left: 380px; }

        @media (max-width: 640px) {
          .skip-link {
            font-size: 12px;
            padding: 6px 12px;
          }
          .skip-link:nth-child(2) { left: 120px; }
          .skip-link:nth-child(3) { left: 210px; }
          .skip-link:nth-child(4) { left: 300px; }
        }
      `}</style>
    </div>
  );
}