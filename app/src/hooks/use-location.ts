import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getLocation, saveLocation } from '@/constants/api';
import { DEFAULT_LOCATION } from '@/constants/locations';

export function useLocation() {
  const [location, setLocationState] = useState<string>(DEFAULT_LOCATION);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadLocation = async () => {
        try {
          const saved = await getLocation();
          if (saved && !cancelled) {
            setLocationState(saved);
          }
        } catch (error) {
          console.error('Failed to load location:', error);
        }
      };
      loadLocation();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const setLocation = useCallback(async (loc: string) => {
    setLocationState(loc);
    try {
      await saveLocation(loc);
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  }, []);

  return { location, setLocation };
}
