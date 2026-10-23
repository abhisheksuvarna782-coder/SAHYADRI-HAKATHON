import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import MainLayout from '@/layouts/MainLayout'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import TripsPage from '@/pages/TripsPage'
import TripDetailPage from '@/pages/TripDetailPage'
import DisruptionCenterPage from '@/pages/DisruptionCenterPage'
import RecoveryWorkspacePage from '@/pages/RecoveryWorkspacePage'
import RecoveryHistoryPage from '@/pages/RecoveryHistoryPage'
import ConstraintsPage from '@/pages/ConstraintsPage'
import AssistantPage from '@/pages/AssistantPage'
import InitialLoadingScreen from '@/components/InitialLoadingScreen'

export default function App() {
  const [hasLoaded, setHasLoaded] = useState(() => {
    return sessionStorage.getItem('rr_app_loaded') === 'true'
  })

  const handleFinishLoading = () => {
    sessionStorage.setItem('rr_app_loaded', 'true')
    setHasLoaded(true)
  }

  return (
    <>
      {!hasLoaded && (
        <InitialLoadingScreen onFinished={handleFinishLoading} />
      )}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/:tripId" element={<TripDetailPage />} />
            <Route path="/disruptions" element={<DisruptionCenterPage />} />
            <Route path="/recovery/:recoveryId" element={<RecoveryWorkspacePage />} />
            <Route path="/recovery" element={<RecoveryHistoryPage />} />
            <Route path="/constraints" element={<ConstraintsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
