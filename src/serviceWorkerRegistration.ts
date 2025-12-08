// This optional code is used to register a service worker.
// register() is not called by default.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

// To learn more about the benefits of this model and instructions on how to
// opt-in, read https://cra.link/PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

// setIntervalのIDを保存（クリーンアップ用）
let swUpdateCheckIntervalId: number | undefined;

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
              'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('🔧 Service Worker registered successfully');
      
      // 即座に更新をチェック
      registration.update().then(() => {
        console.log('🔍 Service Worker update check completed');
      });

      registration.onupdatefound = () => {
        console.log('🆕 Service Worker update found');
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          console.log('🔄 Service Worker state changed:', installingWorker.state);
          
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('🔄 New content is available - waiting for user action');

              // 非強制: クライアントへ更新利用可能イベントを通知
              try {
                window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
              } catch (e) {
                // 例外は無視
              }

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('✅ Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };

      // 定期的に更新をチェック（5分間隔）
      // 既存のタイマーをクリア（重複実行防止）
      if (swUpdateCheckIntervalId) {
        clearInterval(swUpdateCheckIntervalId);
        console.log('🧹 Cleared existing Service Worker update check timer');
      }
      
      swUpdateCheckIntervalId = window.setInterval(() => {
        console.log('⏰ Periodic Service Worker update check');
        registration.update().catch(error => {
          console.warn('⚠️ Service Worker update check failed:', error);
        });
      }, 5 * 60 * 1000);

    })
    .catch((error) => {
      console.error('❌ Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
    cache: 'no-cache' // キャッシュを回避
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            console.log('🔄 Service Worker unregistered, reloading page');
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('📱 No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister().then(() => {
          console.log('🗑️ Service Worker unregistered');
        });
      })
      .catch((error) => {
        console.error('❌ Error unregistering Service Worker:', error.message);
      });
  }
}

/**
 * 強制的にService Workerを更新
 */
export function forceUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        console.log('🔄 Force updating Service Worker');
        registration.update();
        
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }
}

/**
 * リソースをクリーンアップ（HMR対応）
 */
export function cleanup(): void {
  if (swUpdateCheckIntervalId) {
    clearInterval(swUpdateCheckIntervalId);
    swUpdateCheckIntervalId = undefined;
    console.log('🧹 ServiceWorkerRegistration: Update check timer cleared');
  }
}
