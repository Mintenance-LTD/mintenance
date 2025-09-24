import React from 'react';
import { StripeProvider as RNStripeProvider } from '@stripe/stripe-react-native';
import { config } from '../config/environment';

interface Props {
  children: React.ReactNode;
}

// Wrap children with StripeProvider only when a publishable key is set.
// This prevents crashes in environments/tests without Stripe configured.
const StripeProvider: React.FC<Props> = ({ children }) => {
  const publishableKey = config.stripePublishableKey;

  if (!publishableKey) {
    // No key configured: render children directly
    return <>{children}</>;
  }

  return (
    <RNStripeProvider publishableKey={publishableKey}>
      {children as any}
    </RNStripeProvider>
  );
};

export default StripeProvider;
