import { Navigate } from 'react-router-dom';

// A route-level boundary prevents direct links from mounting upstream referral
// queries, signup offers, reward claims or mobile-app redirects.
export const ReferralsUnavailablePage = () => <Navigate to="/" replace />;
