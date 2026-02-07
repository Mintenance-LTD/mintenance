import { theme } from '@/lib/theme';

interface SenderData {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
}

interface JobMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender?: SenderData | SenderData[];
}

interface LatestUpdatesProps {
  messages: JobMessage[];
}

function getSender(sender: SenderData | SenderData[] | undefined): SenderData | undefined {
  if (!sender) return undefined;
  return Array.isArray(sender) ? sender[0] : sender;
}

export function LatestUpdates({ messages }: LatestUpdatesProps) {
  return (
    <div style={{
      backgroundColor: theme.colors.surface, padding: theme.spacing[6],
      borderRadius: '18px', border: `1px solid ${theme.colors.border}`
    }}>
      <h4 style={{
        fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary, marginBottom: theme.spacing[4]
      }}>
        Latest Updates
      </h4>

      <div style={{ overflow: 'hidden' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {messages.map((message) => {
            const hoursAgo = Math.floor((Date.now() - new Date(message.created_at).getTime()) / (1000 * 60 * 60));
            const sender = getSender(message.sender);
            return (
              <li key={message.id}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing[3] }}>
                    <div style={{ position: 'relative' }}>
                      {sender?.profile_image_url ? (
                        <div style={{
                          backgroundImage: `url(${sender.profile_image_url})`, backgroundSize: 'cover',
                          backgroundPosition: 'center', aspectRatio: '1', width: '32px', height: '32px', borderRadius: '50%'
                        }} />
                      ) : (
                        <div style={{
                          backgroundColor: theme.colors.primary, aspectRatio: '1', width: '32px', height: '32px',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 'bold', fontSize: theme.typography.fontSize.sm
                        }}>
                          {sender?.first_name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div style={{
                      minWidth: 0, flex: 1, backgroundColor: theme.colors.backgroundSecondary,
                      borderRadius: theme.borderRadius.lg, padding: theme.spacing[3]
                    }}>
                      <div>
                        <div style={{ fontSize: theme.typography.fontSize.sm }}>
                          <p style={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textPrimary, margin: 0 }}>
                            {sender?.first_name} {sender?.last_name}
                          </p>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                          {message.content}
                        </p>
                      </div>
                      <div style={{ marginTop: theme.spacing[2], display: 'flex', justifyContent: 'flex-start' }}>
                        <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary }}>
                          {hoursAgo} {hoursAgo === 1 ? 'hour' : 'hours'} ago
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {messages.length === 0 && (
            <li>
              <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: theme.spacing[4] }}>
                No updates yet
              </p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
