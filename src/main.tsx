import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

// Removed blocking testConnection for faster mobile loading
// async function testConnection() {
//   try {
//     await getDocFromServer(doc(db, 'test', 'connection'));
//     console.log("Firebase connection successful");
//   } catch (error) {
//     console.error("Firebase check bypassed:", error);
//   }
// }
// testConnection();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
