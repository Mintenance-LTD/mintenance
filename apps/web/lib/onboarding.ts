export { OnboardingService } from './services/OnboardingService';
export type { OnboardingStatus } from './services/OnboardingService';

// Helper function for easy import
import { OnboardingService } from './services/OnboardingService';

export async function getOnboardingStatus(userId: string) {
    return OnboardingService.checkOnboardingStatus(userId);
}

export async function markOnboardingComplete(userId: string) {
    return OnboardingService.markOnboardingComplete(userId);
}
