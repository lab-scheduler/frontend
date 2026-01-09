import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { OrganizationProvider } from './context/OrganizationContext'
import { ShiftDataProvider } from './context/ShiftDataContext'
import { AnalyticsCacheProvider } from './context/AnalyticsCacheContext'
import { DashboardCacheProvider } from './context/DashboardCacheContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <ShiftDataProvider>
            <AnalyticsCacheProvider>
              <DashboardCacheProvider>
                <App />
              </DashboardCacheProvider>
            </AnalyticsCacheProvider>
          </ShiftDataProvider>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)