export interface ListingCardProps {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  price: string;
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
  badge?: string;
  onFavorite?: (id: string) => void;
  onClick?: (id: string) => void;
}

export interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  variant?: 'hero' | 'inline';
  className?: string;
}

export interface SearchParams {
  service?: string;
  location?: string;
  date?: string;
}

export interface ContractorCardProps {
  id: string;
  name: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  hourlyRate: string;
  location: string;
  isVerified?: boolean;
  isFavorite?: boolean;
  skills?: string[];
  onFavorite?: (id: string) => void;
  onClick?: (id: string) => void;
}

export interface PhotoGalleryProps {
  images: string[];
  alt: string;
  onImageClick?: (index: number) => void;
}

export interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'outline'
    | 'link'
    | 'danger'
    | 'destructive'
    | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface CarouselProps {
  children: React.ReactNode;
  gap?: number;
  showArrows?: boolean;
}
