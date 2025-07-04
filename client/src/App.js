import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Index from './backend/pages/Index';
import MainLayout from './backend/layout/MainLayout';
import '../src/assets/css/backend/style.css';
import BookingPage from './backend/pages/BookingPage';
import Manifest from './backend/pages/Manifest';
import Profile from './backend/pages/Profile';
import Activity from './backend/pages/Activity';
import SpecificActivity from './backend/pages/SpecificActivity';
import ActivityAvailabilitiesPage from './backend/components/ActivityPage/ActivityAvailabilitiesPage';

const Settings = () => <div style={{ padding: 40, textAlign: 'center' }}><h2>Settings page coming soon.</h2></div>;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
          <Routes>
            <Route path='/' element={<MainLayout />}>
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
