'use client';

import { useState, useEffect } from 'react';

export function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.sessionStorage.getItem(key);
        if (item) {
          const parsedValue = JSON.parse(item);
          console.log(`SessionStorage読み込み完了 - ${key}:`, parsedValue);
          setStoredValue(parsedValue);
        } else {
          console.log(`SessionStorage - ${key}: データなし`);
        }
        setIsLoaded(true);
      }
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      setIsLoaded(true);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      setStoredValue((currentValue) => {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        
        // SessionStorageに保存
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
        
        console.log(`SessionStorage更新 - ${key}:`, valueToStore);
        return valueToStore;
      });
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue, isLoaded] as const;
}