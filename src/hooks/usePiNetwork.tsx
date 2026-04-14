import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (payment: any) => void
      ) => Promise<{
        user: { uid: string; username: string };
        accessToken: string;
      }>;
      createPayment: (
        paymentData: { amount: number; memo: string; metadata: Record<string, any> },
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onReadyForServerCompletion: (paymentId: string, txid: string) => void;
          onCancel: (paymentId: string) => void;
          onError: (error: any, payment?: any) => void;
        }
      ) => void;
      Ads: {
        requestAd: (adType: string) => Promise<void>;
        showAd: (adType: string) => Promise<void>;
        isAdReady: (adType: string) => boolean;
      };
    };
  }
}

interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

interface PiContextType {
  piUser: PiUser | null;
  isPiReady: boolean;
  isPiAuthenticated: boolean;
  piLoading: boolean;
  authenticateWithPi: () => Promise<PiUser | null>;
  createPiPayment: (amount: number, memo: string, metadata?: Record<string, any>, callbacks?: {
    onPaymentApproved?: () => void;
    onPaymentCompleted?: () => void;
    onPaymentCancelled?: () => void;
    onPaymentError?: (error: any) => void;
  }) => Promise<void>;
  showPiAd: (adType: 'interstitial' | 'rewarded') => Promise<boolean>;
  signOutPi: () => void;
}

const PiContext = createContext<PiContextType | undefined>(undefined);

const PI_SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';
const isPiBrowser = () => /pibrowser|pi browser/i.test(navigator.userAgent);
const initPi = () => {
  if (!window.Pi) return false;
  window.Pi.init({ version: '2.0' });
  return true;
};

export function PiProvider({ children }: { children: ReactNode }) {
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [isPiReady, setIsPiReady] = useState(false);
  const [piLoading, setPiLoading] = useState(true);

  useEffect(() => {
    // Check if already loaded
    if (initPi()) {
      setIsPiReady(true);
      setPiLoading(false);
      return;
    }

    // Skip Pi SDK loading on localhost if not in Pi Browser to avoid cross-origin errors
    if (!isPiBrowser() && window.location.hostname === 'localhost') {
      console.log('Pi SDK loading skipped on localhost (not in Pi Browser)');
      setPiLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = PI_SDK_URL;
    script.async = true;
    script.onload = () => {
      // Pi object can be attached slightly after script onload on some WebViews.
      if (initPi()) {
        setIsPiReady(true);
        setPiLoading(false);
        return;
      }

      let retries = 0;
      const maxRetries = 10;
      const retryInterval = window.setInterval(() => {
        retries += 1;
        if (initPi()) {
          window.clearInterval(retryInterval);
          setIsPiReady(true);
          setPiLoading(false);
          return;
        }
        if (retries >= maxRetries) {
          window.clearInterval(retryInterval);
          console.warn('Pi SDK loaded but Pi object is unavailable');
          setPiLoading(false);
        }
      }, 200);
    };
    script.onerror = () => {
      console.warn('Pi SDK not available (not in Pi Browser)');
      setPiLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  const onIncompletePaymentFound = useCallback(async (payment: any) => {
    console.log('Incomplete payment found:', payment);
    // Try to complete it via backend
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${baseUrl}/functions/v1/pi-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', paymentId: payment.identifier, txid: payment.transaction?.txid }),
      });
    } catch (err) {
      console.error('Failed to complete payment:', err);
    }
  }, []);

  const authenticateWithPi = useCallback(async (): Promise<PiUser | null> => {
    if (!window.Pi) {
      console.warn('Pi SDK not available');
      return null;
    }
    try {
      setPiLoading(true);
      const auth = await window.Pi.authenticate(
        ['payments', 'username', 'wallet_address'],
        onIncompletePaymentFound
      );
      const user: PiUser = {
        uid: auth.user.uid,
        username: auth.user.username,
        accessToken: auth.accessToken,
      };
      setPiUser(user);
      return user;
    } catch (err) {
      console.error('Pi authentication failed:', err);
      return null;
    } finally {
      setPiLoading(false);
    }
  }, [onIncompletePaymentFound]);

  const createPiPayment = useCallback(async (
    amount: number,
    memo: string,
    metadata?: Record<string, any>,
    callbacks?: {
      onPaymentApproved?: () => void;
      onPaymentCompleted?: () => void;
      onPaymentCancelled?: () => void;
      onPaymentError?: (error: any) => void;
    }
  ): Promise<void> => {
    if (!window.Pi) throw new Error('Pi SDK not available');

    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;
    const enrichedMetadata = {
      ...(metadata || {}),
      buyer_pi_username: piUser?.username || null,
      buyer_pi_uid: piUser?.uid || null,
    };

    return new Promise<void>((resolve, reject) => {
      window.Pi.createPayment(
        { amount, memo, metadata: enrichedMetadata },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              await fetch(`${baseUrl}/functions/v1/pi-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', paymentId, userId, amount, memo, metadata: enrichedMetadata }),
              });
              callbacks?.onPaymentApproved?.();
            } catch (err) {
              console.error('Approval failed:', err);
            }
          },
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            try {
              await fetch(`${baseUrl}/functions/v1/pi-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete', paymentId, txid, userId, amount, memo, metadata: enrichedMetadata }),
              });
              callbacks?.onPaymentCompleted?.();
              resolve();
            } catch (err) {
              console.error('Completion failed:', err);
              reject(err);
            }
          },
          onCancel: (paymentId: string) => {
            console.log('Payment cancelled:', paymentId);
            fetch(`${baseUrl}/functions/v1/pi-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'cancel', paymentId, userId }),
            }).catch(console.error);
            callbacks?.onPaymentCancelled?.();
            reject(new Error('Payment cancelled'));
          },
          onError: (error: any) => {
            console.error('Payment error:', error);
            callbacks?.onPaymentError?.(error);
            reject(error);
          },
        }
      );
    });
  }, [piUser]);

  const showPiAd = useCallback(async (adType: 'interstitial' | 'rewarded'): Promise<boolean> => {
    if (!window.Pi?.Ads) {
      console.warn('Pi Ads not available');
      return false;
    }
    try {
      await window.Pi.Ads.requestAd(adType);
      await window.Pi.Ads.showAd(adType);
      return true;
    } catch (err) {
      console.error('Pi Ad error:', err);
      return false;
    }
  }, []);

  const signOutPi = useCallback(() => {
    setPiUser(null);
  }, []);

  return (
    <PiContext.Provider value={{
      piUser,
      isPiReady,
      isPiAuthenticated: !!piUser,
      piLoading,
      authenticateWithPi,
      createPiPayment,
      showPiAd,
      signOutPi,
    }}>
      {children}
    </PiContext.Provider>
  );
}

export function usePiNetwork() {
  const context = useContext(PiContext);
  if (!context) throw new Error('usePiNetwork must be used within PiProvider');
  return context;
}
