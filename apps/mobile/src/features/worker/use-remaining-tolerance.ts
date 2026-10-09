import { useEffect, useState } from 'react';

/**
 * Live mm:ss countdown from a server-issued deadline, ticking every second.
 * Both the client and the worker derive from the same llamado deadline, so
 * the two screens stay synchronized without any extra channel.
 */
export function useRemainingTolerance(deadline: string | null): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  if (!deadline) return null;
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
