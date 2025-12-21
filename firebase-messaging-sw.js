// Firebase Messaging Service Worker
// This file handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
const firebaseConfig = {
    apiKey: "AIzaSyD_ERgjNFwN2BEQfsd4u80mAge5d-3e2k4",
    authDomain: "schoolattendance-7a711.firebaseapp.com",
    projectId: "schoolattendance-7a711",
    storageBucket: "schoolattendance-7a711.firebasestorage.app",
    messagingSenderId: "647726152144",
    appId: "1:647726152144:web:7996c0c49cbb034bc1a1d5"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'नयाँ सन्देश';
    const notificationOptions = {
        body: payload.notification?.body || 'तपाईंलाई नयाँ सूचना प्राप्त भएको छ',
        icon: payload.notification?.icon || 'https://cdn-icons-png.flaticon.com/512/3413/3413535.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3413/3413535.png',
        tag: 'attendance-notification',
        requireInteraction: false,
        data: payload.data || {}
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (let client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
