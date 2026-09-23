/**
 * Service marks.
 *
 * These are deliberately simple geometric stand-ins in each brand's colour
 * rather than traced copies of the official logos: they read cleanly at small
 * sizes and avoid shipping someone else's trademark artwork. Swap in official
 * assets if and when you have permission to use them.
 */

export function ChatGptMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#10a37f" />
      <path
        d="M20 9.5 29 15v10l-9 5.5L11 25V15l9-5.5Z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path d="M20 14.5v11M15.2 17.2 24.8 22.8M24.8 17.2 15.2 22.8" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function ClaudeMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#f4ede8" />
      <g stroke="#d97757" strokeWidth="2.6" strokeLinecap="round">
        <path d="M20 10v20M10 20h20M12.9 12.9l14.2 14.2M27.1 12.9 12.9 27.1" />
      </g>
    </svg>
  );
}

export function GrokMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#111111" />
      <path
        d="M13 28.5 27.5 11.5M17.5 11.5h9.5v9"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function RewardGptMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M8 26V6h9.2a6.4 6.4 0 0 1 0 12.8H13"
        fill="none"
        stroke="#101010"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m16.5 18.8 7.5 7.2" stroke="#10a37f" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export const SERVICE_MARKS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  chatgpt: ChatGptMark,
  claude: ClaudeMark,
  grok: GrokMark,
};
