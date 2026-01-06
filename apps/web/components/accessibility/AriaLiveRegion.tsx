'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * ARIA Live Region for Screen Reader Announcements
 * WCAG 2.1 Level A - Criterion 4.1.3: Status Messages
 */

type AriaLiveProps = {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
};

type AriaLiveContextType = {
  announce: (message: string, options?: AriaLiveProps) => void;
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
};

const AriaLiveContext = createContext<AriaLiveContextType | undefined>(undefined);

export function AriaLiveProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, options?: AriaLiveProps) => {
    const politeness = options?.politeness || 'polite';

    // Clear and set message to ensure screen readers announce it
    if (politeness === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 100);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 100);
    }

    // Auto-clear after 5 seconds
    setTimeout(() => {
      if (politeness === 'assertive') {
        setAssertiveMessage('');
      } else {
        setPoliteMessage('');
      }
    }, 5000);
  }, []);

  const announcePolite = useCallback((message: string) => {
    announce(message, { politeness: 'polite' });
  }, [announce]);

  const announceAssertive = useCallback((message: string) => {
    announce(message, { politeness: 'assertive' });
  }, [announce]);

  return (
    <AriaLiveContext.Provider value={{ announce, announcePolite, announceAssertive }}>
      {children}

      {/* Polite announcements (wait for user to finish current task) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements (interrupt immediately) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  );
}

export function useAriaLive() {
  const context = useContext(AriaLiveContext);
  if (!context) {
    throw new Error('useAriaLive must be used within AriaLiveProvider');
  }
  return context;
}

/**
 * Screen reader only text utility class
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}