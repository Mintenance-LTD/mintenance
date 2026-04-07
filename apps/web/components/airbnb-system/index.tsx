/**
 * Mintenance Airbnb-Quality Component System
 * Production-ready components matching Airbnb's design standards
 *
 * Design Principles:
 * - Photography-first (large, high-quality images)
 * - Subtle micro-interactions (smooth hover, scale effects)
 * - Consistent spacing (8px grid)
 * - Accessibility-first (ARIA labels, keyboard nav)
 * - Performance-optimized (React.memo, lazy loading)
 */

import '@/styles/airbnb-system.css';

export type {
  ListingCardProps,
  SearchBarProps,
  SearchParams,
  ContractorCardProps,
  PhotoGalleryProps,
  RatingStarsProps,
  BadgeProps,
  ButtonProps,
  InputProps,
  ModalProps,
  CarouselProps,
} from './types';

export { ListingCard } from './ListingCard';
export { SearchBar } from './SearchBar';
export { ContractorCard } from './ContractorCard';
export { PhotoGallery } from './PhotoGallery';
export { RatingStars } from './RatingStars';
export { Badge } from './Badge';
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { Carousel } from './Carousel';

import { ListingCard } from './ListingCard';
import { SearchBar } from './SearchBar';
import { ContractorCard } from './ContractorCard';
import { PhotoGallery } from './PhotoGallery';
import { RatingStars } from './RatingStars';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Carousel } from './Carousel';

export default {
  ListingCard,
  SearchBar,
  ContractorCard,
  PhotoGallery,
  RatingStars,
  Badge,
  Button,
  Input,
  Modal,
  Carousel,
};
