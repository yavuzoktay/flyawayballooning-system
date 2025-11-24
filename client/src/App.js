import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Index from './backend/pages/Index';
import MainLayout from './backend/layout/MainLayout';
import '../src/assets/css/backend/style.css';
import '../src/assets/css/backend/settings.css';
import BookingPage from './backend/pages/BookingPage';
import Manifest from './backend/pages/Manifest';
import Profile from './backend/pages/Profile';
import Activity from './backend/pages/Activity';
import SpecificActivity from './backend/pages/SpecificActivity';
import ActivityAvailabilitiesPage from './backend/components/ActivityPage/ActivityAvailabilitiesPage';
import Settings from './backend/pages/Settings';
import Login from './backend/pages/Login';
import CustomerPortal from './backend/pages/CustomerPortal';

function RequireAuth({ children }) {
  const location = useLocation();
  const authed = typeof window !== 'undefined' && localStorage.getItem('fab_admin_auth') === 'true';
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

const BookingDomainLoginRedirect = () => {
  useEffect(() => {
    window.location.replace('https://flyawayballooning-system.com/login');
  }, []);
  return null;
};

function App() {
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname.toLowerCase() : '';
  const isBookingDomain = hostname.includes('flyawayballooning-book.com');

  return (
    <div className="App">
      <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={isBookingDomain ? <BookingDomainLoginRedirect /> : <Login />}
            />
            <Route path="/customerPortal/:token" element={<CustomerPortal />} />
            <Route path="/customerPortal/:token/*" element={<CustomerPortal />} />
            <Route path='/' element={<RequireAuth><MainLayout /></RequireAuth>}>
                <Route path="/" element={<Index />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/manifest" element={<Manifest />} />
                <Route path="/profile/:booking_id/:email" element={<Profile />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/specificActivity/:id" element={<SpecificActivity />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/activity/:id/availabilities" element={<ActivityAvailabilitiesPage />} />
            </Route>
          </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
