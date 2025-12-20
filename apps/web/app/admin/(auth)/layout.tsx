// Public layout for admin auth routes (login, register)
// This layout allows unauthenticated access
export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

