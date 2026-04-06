/**
 * Format a number with commas
 */
export function formatNumber(num) {
  if (num == null) return '0';
  return num.toLocaleString();
}

/**
 * Format a relative time (e.g., "2 minutes ago")
 */
export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a status string to human-readable label
 */
export function formatStatus(status) {
  const map = {
    triggered: 'Triggered',
    comment_replied: 'Replied',
    dm_sent: 'DM Sent',
    follow_verified: 'Followed ✅',
    follow_failed: 'Not Following',
    revoked: 'Revoked',
    error: 'Error',
  };
  return map[status] || status;
}

/**
 * Truncate text
 */
export function truncate(str, maxLen = 50) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}
