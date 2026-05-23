import { useState, useEffect } from 'react';

export function useCountdown(targetDate: string | Date, serverTimeOffsetMs: number = 0) {
  const [seconds, setSeconds] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!targetDate) {
        setSeconds(0);
        setIsExpired(true);
        return;
      }
      const targetTime = new Date(targetDate).getTime();
      if (isNaN(targetTime)) {
        setSeconds(0);
        setIsExpired(true);
        return;
      }
      // Adjust with server time offset if provided
      const now = Date.now() + serverTimeOffsetMs;
      const difference = targetTime - now;

      if (difference <= 0) {
        setSeconds(0);
        setIsExpired(true);
        return;
      }

      setSeconds(Math.floor(difference / 1000));
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, serverTimeOffsetMs]);

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  return {
    seconds,
    isExpired,
    formatted: formatTime(seconds)
  };
}
