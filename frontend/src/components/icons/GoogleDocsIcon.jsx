/**
 * Google Docs-style document icon: blue doc with folded corner and text lines.
 * Use for "View" report and document-related actions.
 */
export const GoogleDocsIcon = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    {/* Main document body - vertical blue rectangle, rounded, with top-right cut for fold */}
    <path
      d="M6 2h9v5h5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
      fill="#4285F4"
    />
    {/* Folded corner - darker blue triangle at top-right */}
    <path
      d="M15 2v5h5l-5-5z"
      fill="#3367D6"
    />
    {/* Text lines - white horizontal bars */}
    <rect x="8" y="11" width="8" height="1.25" rx="0.3" fill="white" />
    <rect x="8" y="14" width="8" height="1.25" rx="0.3" fill="white" />
    <rect x="8" y="17" width="5" height="1.25" rx="0.3" fill="white" />
  </svg>
);

export default GoogleDocsIcon;
