import React, {createContext, useContext, useState, useEffect} from 'react'
const AuthContext = createContext(null)
export function useAuth(){ return useContext(AuthContext) }
function parseJwt(token){ try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} } }
export function AuthProvider({children}){
  const [token, setToken] = useState(()=>localStorage.getItem('api_token'))
  const [user, setUser] = useState(token ? parseJwt(token) : null)
  useEffect(()=>{
    if(token){ localStorage.setItem('api_token', token); setUser(parseJwt(token)) }
    else { localStorage.removeItem('api_token'); setUser(null) }
  },[token])
  return (
    <AuthContext.Provider value={{token, user, login:setToken, logout:()=>setToken(null)}}>
      {children}
    </AuthContext.Provider>
  )
}