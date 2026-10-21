import '~/index.css';
// Initialize dayjs with plugins and custom locale (replaces moment)
import '~/utils/dayjs';

import { configureCastPageOrigins, initDateFns } from 'farcaster-client-hooks';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '~/components/App';
import { forkConfig } from '~/fork/config';
import { whiteLabel } from '~/fork/whiteLabel';
import { initAnalytics } from '~/init/initAnalytics';
import { initFarcasterApi } from '~/init/initFarcasterApi';
import { initPolyfills } from '~/init/initPolyfills';
import { initPreloadLazyComponents } from '~/init/initPreloadLazyComponents';

const init = () => {
  if (whiteLabel.enabled) {
    configureCastPageOrigins([forkConfig.canonicalUrl, window.location.origin]);
  }
  initAnalytics();
  initDateFns();
  initFarcasterApi();
  initPolyfills();
  initPreloadLazyComponents();
};

init();

const $root = document.getElementById('root');

if ($root) {
  const root = ReactDOM.createRoot($root);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
