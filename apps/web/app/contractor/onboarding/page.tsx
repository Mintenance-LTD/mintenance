import { Metadata } from 'next';
import { OnboardingWizard } from './OnboardingWizard';

export const metadata: Metadata = {
  title: 'Set Up Your Account | Mintenance',
  description: 'Complete your contractor profile to start receiving job opportunities.',
};

export default function ContractorOnboardingPage() {
  return <OnboardingWizard />;
}
