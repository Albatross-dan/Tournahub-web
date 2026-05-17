import { useState, useEffect, useMemo } from 'react';

export function useCountdown(targetIso: string | null, serverTimeOffsetMs: number = 0) {
  const [seconds, setSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!targetIso) {
      setSeconds(0);
      setIsExpired(false);
      return;
    }

    const targetTime = new Date(targetIso).getTime();

    const calculate = () => {
      const now = Date.now() + serverTimeOffsetMs;
      const diff = Math.floor((targetTime - now) / 1000);
      
      if (diff <= 0) {
        setSeconds(0);
        setIsExpired(true);
        return false; // Stop ticking
      } else {
        setSeconds(diff);
        setIsExpired(false);
        return true;
      }
    };

    // Initial check
    const running = calculate();
    if (!running) return;

    const interval = setInterval(() => {
      if (!calculate()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetIso, serverTimeOffsetMs]);

  const formatted = useMemo(() => {
    if (seconds <= 0) return '00:00:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    return [h, m, s]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  }, [seconds]);

  return { seconds, isExpired, formatted };
}
