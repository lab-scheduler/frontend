import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function RequireAuth({children, allowedRoles}){
  const { token, user } = useAuth()
  if(!token) return <Navigate to="/login" />
  if(allowedRoles && !allowedRoles.includes(user.role)) return <div className="p-6">Forbidden</div>
  return children
}