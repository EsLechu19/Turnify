import { useEffect, useState } from 'react';

export function useEstimatedWaitSeconds(waitMinutes: number | null | undefined): number {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.round((waitMinutes ?? 0) * 60)));

  useEffect(() => {
    const initial = Math.max(0, Math.round((waitMinutes ?? 0) * 60));
    setSeconds(initial);
    if (initial === 0) return;

    const interval = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [waitMinutes]);

  return seconds;
}
