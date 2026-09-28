import { useState, useEffect } from 'react';
import { networkService } from '../services/networkService';

export function useNetworkStatus() {
  const [status, setStatus] = useState(() => networkService.getStatus());
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = networkService.subscribe((currentStatus) => {
      setStatus(currentStatus);
      if (!currentStatus.isOnline) {
        setWasOffline(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Automatically reset wasOffline shortly after we are back online
  useEffect(() => {
    if (status.isOnline && wasOffline) {
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status.isOnline, wasOffline]);

  return { 
    isOnline: status.isOnline && status.isRealConnection, 
    wasOffline 
  };
}

