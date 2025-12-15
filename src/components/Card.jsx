import React from 'react'
export default function Card({children,className=''}){
  return <div className={`bg-white p-5 rounded shadow ${className}`}>{children}</div>
}