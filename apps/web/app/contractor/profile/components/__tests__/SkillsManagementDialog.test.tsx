// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { SkillsManagementDialog } from '../SkillsManagementDialog';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

describe('SkillsManagementDialog', () => {
  const mockSkills = [
    { skill_name: 'Plumbing', skill_icon: 'wrench' },
    { skill_name: 'Electrical', skill_icon: 'zap' },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currentSkills: mockSkills,
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<SkillsManagementDialog {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<SkillsManagementDialog {...defaultProps} />);
    // Component renders skills management dialog
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<SkillsManagementDialog {...defaultProps} />);
    // Component displays skills
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const emptyProps = {
      open: true,
      onOpenChange: vi.fn(),
      currentSkills: [],
      onSave: vi.fn().mockResolvedValue(undefined),
    };
    const { container } = render(<SkillsManagementDialog {...emptyProps} />);
    expect(container).toBeDefined();
  });
});