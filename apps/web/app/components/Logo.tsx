export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background rounded square */}
      <rect width="100" height="100" rx="20" fill="#0F172A" />

      {/* Wrench icon in teal/cyan */}
      <g transform="translate(25, 25)">
        <path
          d="M45 15C45 11.5 43 8.5 40 7C39 10 37 12 34 12C31 12 29 10 28 7C25 8.5 23 11.5 23 15C23 19.5 26.5 23 31 23H37C41.5 23 45 19.5 45 15Z"
          fill="#10B981"
        />
        <path
          d="M34 23V45C34 47 35.5 48.5 37.5 48.5C39.5 48.5 41 47 41 45V23"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="34" cy="12" r="3" fill="#10B981" />
      </g>
    </svg>
  );
}
