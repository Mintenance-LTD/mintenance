import { theme } from '@/lib/theme';

/**
 * Skill chips list. Renders nothing if the contractor has no skills.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 */
export function SkillsSection({
  skills,
}: {
  skills?: Array<{ skill_name: string }> | null;
}) {
  if (!skills || skills.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
        marginBottom: theme.spacing[8],
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <h2
        style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.text,
          marginBottom: theme.spacing[4],
        }}
      >
        Skills & Expertise
      </h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing[2],
        }}
      >
        {skills.map((skill, index) => (
          <span
            key={index}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.backgroundSecondary,
              color: theme.colors.text,
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {skill.skill_name}
          </span>
        ))}
      </div>
    </div>
  );
}
