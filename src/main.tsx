import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

function removeInjectedHostingBadges() {
  const root = document.getElementById('root');
  Array.from(document.body.children).forEach((el) => {
    if (el === root || el.tagName === 'SCRIPT') return;
    const text = (el.textContent || '').toLowerCase();
    const html = (el.outerHTML || '').toLowerCase();
    if (text.includes('powered by netlify') || html.includes('netlify')) {
      el.remove();
    }
  });
}

removeInjectedHostingBadges();
const badgeObserver = new MutationObserver(() => removeInjectedHostingBadges());
badgeObserver.observe(document.body, { childList: true, subtree: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
