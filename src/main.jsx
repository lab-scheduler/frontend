import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ShiftDataProvider } from './context/ShiftDataContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ShiftDataProvider>
          <App />
        </ShiftDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)