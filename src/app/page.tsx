'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import TopAppBar from '@/components/layout/TopAppBar'
import BottomNavBar from '@/components/layout/BottomNavBar'
import HeroSection from '@/components/home/HeroSection'
import FeaturedCourts from '@/components/home/FeaturedCourts'
import SportsSection from '@/components/home/SportsSection'
import HowItWorks from '@/components/home/HowItWorks'
import SearchView from '@/components/search/SearchView'
import CourtDetail from '@/components/courts/CourtDetail'
import BookingForm from '@/components/bookings/BookingForm'
import BookingsView from '@/components/bookings/BookingsView'
import ProfileView from '@/components/profile/ProfileView'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AuthView from '@/components/auth/AuthView'

function HomeView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <HeroSection />
      <FeaturedCourts />
      <SportsSection />
      <HowItWorks />
    </motion.div>
  )
}

function ViewRouter() {
  const { currentView } = useAppStore()

  return (
    <AnimatePresence mode="wait">
      {currentView === 'home' && <HomeView key="home" />}
      {currentView === 'search' && (
        <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <SearchView />
        </motion.div>
      )}
      {currentView === 'court-detail' && (
        <motion.div key="court-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          <CourtDetail />
        </motion.div>
      )}
      {currentView === 'booking-form' && (
        <motion.div key="booking-form" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ type: 'tween', duration: 0.25 }}>
          <BookingForm />
        </motion.div>
      )}
      {currentView === 'bookings' && (
        <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <BookingsView />
        </motion.div>
      )}
      {currentView === 'profile' && (
        <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <ProfileView />
        </motion.div>
      )}
      {currentView === 'admin' && (
        <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <AdminDashboard />
        </motion.div>
      )}
      {(currentView === 'login' || currentView === 'register') && (
        <motion.div key="auth" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
          <AuthView />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Home() {
  const { currentView } = useAppStore()
  const isFullPage = currentView === 'booking-form' || currentView === 'login' || currentView === 'register'

  return (
    <div className="min-h-screen flex flex-col bg-cm-background">
      {!isFullPage && <TopAppBar />}
      <main className={`flex-1 ${isFullPage ? '' : 'pt-16 pb-24 md:pb-8'}`}>
        <ViewRouter />
      </main>
      {!isFullPage && <BottomNavBar />}
    </div>
  )
}
