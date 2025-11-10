/**
 * Card Component Index
 * 
 * Main export for Card component - Web-only exports to avoid React Native imports
 */

// Export web-only components to avoid React Native bundling issues in web builds
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './Card.web';
export type { WebCardProps, BaseCardProps, CardVariant, CardPadding } from './types';

// Note: CardBody is native-only and should not be exported for web builds
