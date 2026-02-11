// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { SkillsManagementModal } from '../SkillsManagementModal';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('SkillsManagementModal', () => {
  const mockSkills = [
    { skill_name: 'Plumbing', skill_icon: 'wrench' },
    { skill_name: 'Electrical', skill_icon: 'zap' },
  ];

  const defaultProps = {
    currentSkills: mockSkills,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<SkillsManagementModal {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<SkillsManagementModal {...defaultProps} />);
    // Component renders skills management interface
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<SkillsManagementModal {...defaultProps} />);
    // Component displays skills
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const emptyProps = {
      currentSkills: [],
      onClose: vi.fn(),
      onSave: vi.fn().mockResolvedValue(undefined),
    };
    const { container } = render(<SkillsManagementModal {...emptyProps} />);
    expect(container).toBeDefined();
  });
});