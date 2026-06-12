/**
 * Small, calm privacy/trust note. Used across onboarding, upload, receipt paste,
 * summary, and pricing to set expectations honestly (no legal guarantees).
 */
export function PrivacyNote({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs leading-5 text-slate-500 ${className}`}>
      <span aria-hidden className="mr-1">
        🔒
      </span>
      {children}
    </p>
  );
}
