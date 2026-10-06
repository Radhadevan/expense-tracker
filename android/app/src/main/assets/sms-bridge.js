/**
 * EXPENSE TRACKER — ANDROID NATIVE SMS BRIDGE & INTEGRATION SERVICE
 * 
 * Clean, safe communication bridge between React Application and Native Android SMS Receiver.
 * 
 * Supports:
 * 1. Capacitor Android Native Plugin (`Capacitor.Plugins.AndroidSMS`)
 * 2. Native Android WebView JavascriptInterface (`window.AndroidNativeSMS`)
 * 3. Graceful fallback on iOS, Desktop, and standard web browsers
 * 4. Developer SMS Simulation Hook for testing without device permissions
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AndroidSmsBridge = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Listeners registered by the React app
  const listeners = new Set();

  // Internal permission cache
  let cachedPermission = null;

  /**
   * Determine the current execution runtime environment.
   * Returns: 'android_native' | 'android_webview' | 'ios' | 'web' | 'desktop'
   */
  function detectEnvironment() {
    // 1. Check if Capacitor is available and on native Android
    if (typeof window !== 'undefined' && window.Capacitor) {
      const platform = window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : '';
      if (platform === 'android' && window.Capacitor.isNativePlatform()) {
        return 'android_native';
      }
      if (platform === 'ios') {
        return 'ios';
      }
    }

    // 2. Check if native Android WebView JavascriptInterface is injected
    if (typeof window !== 'undefined' && (window.AndroidNativeSMS || window.AndroidSMS)) {
      return 'android_webview';
    }

    // 3. User agent checks for browser fallback
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/android/i.test(ua)) {
        return 'android_browser';
      }
      if (/iphone|ipad|ipod/i.test(ua)) {
        return 'ios';
      }
    }

    return 'web';
  }

  const currentEnv = detectEnvironment();
  const isNativeAndroid = currentEnv === 'android_native' || currentEnv === 'android_webview';

  /**
   * Safe bridge implementation
   */
  const AndroidSmsBridge = {
    // Environment Info
    environment: currentEnv,
    isSupported: isNativeAndroid,

    /**
     * Check if Android SMS capabilities are supported on this device/environment.
     */
    checkSupport() {
      return {
        isSupported: isNativeAndroid,
        environment: currentEnv,
        reason: isNativeAndroid
          ? 'Native Android SMS capabilities active'
          : `SMS auto-tracking is disabled on ${currentEnv.toUpperCase()} (Available on Native Android app or via Developer Simulator)`
      };
    },

    /**
     * Check current SMS permission status.
     * Never requests permissions — read-only check.
     */
    async hasPermission(permissionType = 'RECEIVE_SMS') {
      if (!isNativeAndroid) {
        // In web / simulator environment, use simulated preference or cached flag
        return cachedPermission === true;
      }

      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AndroidSMS) {
          const res = await window.Capacitor.Plugins.AndroidSMS.checkPermissions();
          return res && res.receiveSms === 'granted';
        }

        if (window.AndroidNativeSMS && typeof window.AndroidNativeSMS.hasPermission === 'function') {
          return Boolean(window.AndroidNativeSMS.hasPermission(permissionType));
        }
      } catch (err) {
        console.warn('[AndroidSmsBridge] Error checking native permission:', err);
      }

      return false;
    },

    /**
     * Request Android SMS Permission after in-app user disclosure.
     * @param {'RECEIVE_SMS' | 'READ_SMS'} permissionType
     */
    async requestPermission(permissionType = 'RECEIVE_SMS') {
      if (!isNativeAndroid) {
        // In web mode / simulator, simulate successful user grant for testing
        cachedPermission = true;
        return { granted: true, simulated: true };
      }

      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AndroidSMS) {
          const res = await window.Capacitor.Plugins.AndroidSMS.requestPermissions({ type: permissionType });
          const granted = res && (res.receiveSms === 'granted' || res.readSms === 'granted');
          cachedPermission = granted;
          return { granted, error: null };
        }

        if (window.AndroidNativeSMS && typeof window.AndroidNativeSMS.requestPermission === 'function') {
          const granted = Boolean(window.AndroidNativeSMS.requestPermission(permissionType));
          cachedPermission = granted;
          return { granted, error: null };
        }
      } catch (err) {
        console.error('[AndroidSmsBridge] Permission request error:', err);
        return { granted: false, error: err.message || 'Permission request failed' };
      }

      return { granted: false, error: 'Android SMS provider not found' };
    },

    /**
     * Enable or disable native SMS broadcast receiver.
     */
    async enableReceiver(enabled) {
      if (!isNativeAndroid) return true;

      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AndroidSMS) {
          await window.Capacitor.Plugins.AndroidSMS.enableReceiver({ enabled: Boolean(enabled) });
        } else if (window.AndroidNativeSMS && typeof window.AndroidNativeSMS.setReceiverEnabled === 'function') {
          window.AndroidNativeSMS.setReceiverEnabled(Boolean(enabled));
        }
      } catch (err) {
        console.warn('[AndroidSmsBridge] Error toggling native receiver:', err);
      }
      return true;
    },

    /**
     * Query historical SMS for "Import Previous Transactions" feature.
     * Only called after explicit user initiation with date range.
     * @param {number} days - Number of days to look back (e.g. 7, 30, 90)
     */
    async queryHistoricalSms(days = 30) {
      if (!isNativeAndroid) {
        console.info('[AndroidSmsBridge] queryHistoricalSms called in non-native environment; returning sample bank alerts.');
        // Return sample test fixtures for demonstration
        return [
          {
            sender: 'VM-HDFCBK',
            body: 'Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI. Ref 453829102',
            timestamp: Date.now() - 3600000 * 24 * 2
          },
          {
            sender: 'VK-SBIINB',
            body: 'Rs.250 debited at ABC RESTAURANT. Avl Bal Rs.14,250.00',
            timestamp: Date.now() - 3600000 * 24 * 4
          },
          {
            sender: 'AX-AXISBK',
            body: 'Salary of Rs.25,000 credited to A/c XX1234.',
            timestamp: Date.now() - 3600000 * 24 * 5
          },
          {
            sender: 'HP-ICICIB',
            body: 'Rs.450 refund credited to your A/c XX1234 for Swiggy order.',
            timestamp: Date.now() - 3600000 * 24 * 6
          },
          {
            sender: 'BW-HDFCBK',
            body: 'Rs.1,000 transferred to RD.',
            timestamp: Date.now() - 3600000 * 24 * 8
          }
        ];
      }

      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AndroidSMS) {
          const res = await window.Capacitor.Plugins.AndroidSMS.queryHistoricalSms({ days });
          return (res && res.messages) ? res.messages : [];
        }

        if (window.AndroidNativeSMS && typeof window.AndroidNativeSMS.queryHistoricalSms === 'function') {
          const jsonStr = window.AndroidNativeSMS.queryHistoricalSms(days);
          return JSON.parse(jsonStr || '[]');
        }
      } catch (err) {
        console.error('[AndroidSmsBridge] Error reading historical SMS:', err);
        throw err;
      }

      return [];
    },

    /**
     * Subscribe to real-time incoming SMS events from Android receiver.
     */
    onSmsReceived(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    /**
     * Internal dispatcher called by native layer or simulator.
     */
    dispatchIncomingSms(smsData) {
      listeners.forEach((fn) => {
        try {
          fn(smsData);
        } catch (e) {
          console.error('[AndroidSmsBridge] Listener error:', e);
        }
      });
    },

    /**
     * Developer Simulator Hook
     * Allows testing real-time transaction detection flow in browser or emulator.
     */
    simulateIncoming(body, sender = 'TEST-BANK') {
      const payload = {
        body: String(body),
        sender: String(sender),
        timestamp: Date.now()
      };
      this.dispatchIncomingSms(payload);
      return payload;
    }
  };

  // Expose global callback for native Android JavascriptInterface
  if (typeof window !== 'undefined') {
    window.__onNativeSmsReceived = function (jsonOrObject) {
      try {
        const data = typeof jsonOrObject === 'string' ? JSON.parse(jsonOrObject) : jsonOrObject;
        AndroidSmsBridge.dispatchIncomingSms(data);
      } catch (e) {
        console.error('[AndroidSmsBridge] Failed to parse native SMS event:', e);
      }
    };
  }

  return AndroidSmsBridge;
});
