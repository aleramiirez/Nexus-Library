import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface InAppBannerData {
  id: string;
  title: string;
  body: string;
  avatarUrl?: string;
  tab: 'recommendations' | 'friend_requests';
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
}

export interface ToastData {
  message: string;
  type: ToastType;
  action?: ToastAction;
}

export interface UseAppNotificationsReturn {
  inAppBanner: InAppBannerData | null;
  setInAppBanner: React.Dispatch<React.SetStateAction<InAppBannerData | null>>;
  showInAppBanner: (banner: InAppBannerData) => void;
  dismissInAppBanner: () => void;

  toast: ToastData | null;
  setToast: React.Dispatch<React.SetStateAction<ToastData | null>>;
  showToast: (
    message: string,
    optionsOrType?: ToastType | ToastOptions
  ) => void;
  dismissToast: () => void;
}

export const useAppNotifications = (): UseAppNotificationsReturn => {
  const [inAppBanner, setInAppBanner] = useState<InAppBannerData | null>(null);
  const inAppBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showInAppBanner = useCallback((banner: InAppBannerData) => {
    if (inAppBannerTimeoutRef.current) {
      clearTimeout(inAppBannerTimeoutRef.current);
      inAppBannerTimeoutRef.current = null;
    }
    setInAppBanner(banner);
    inAppBannerTimeoutRef.current = setTimeout(() => {
      setInAppBanner((curr) => (curr?.id === banner.id ? null : curr));
    }, 7500);
  }, []);

  const dismissInAppBanner = useCallback(() => {
    if (inAppBannerTimeoutRef.current) {
      clearTimeout(inAppBannerTimeoutRef.current);
      inAppBannerTimeoutRef.current = null;
    }
    setInAppBanner(null);
  }, []);

  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (
      message: string,
      optionsOrType: ToastType | ToastOptions = 'info'
    ) => {
      const opts = typeof optionsOrType === 'string' ? { type: optionsOrType } : optionsOrType;
      const type = opts.type ?? 'info';
      const action = opts.action;
      const duration = opts.duration ?? 4500;

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      setToast({ message, type, action });

      toastTimeoutRef.current = setTimeout(() => {
        setToast((curr) => (curr?.message === message ? null : curr));
      }, duration);
    },
    []
  );

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (inAppBannerTimeoutRef.current) {
        clearTimeout(inAppBannerTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return {
    inAppBanner,
    setInAppBanner,
    showInAppBanner,
    dismissInAppBanner,
    toast,
    setToast,
    showToast,
    dismissToast
  };
};
