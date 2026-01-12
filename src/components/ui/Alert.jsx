import React from 'react'

export default function Alert({ type = 'info', children, className = '' }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  }

  return (
    <div className={`p-4 rounded-lg border ${styles[type]} mb-4 ${className}`}>
      {children}
    </div>
  )
}
