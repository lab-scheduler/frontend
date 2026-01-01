import React,{useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuth} from '../context/AuthContext'
import {useOrganization} from '../context/OrganizationContext'
import {apiFetch} from '../api/api'
import Card from '../components/Card'

// Helper function to parse JWT token
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

export default function LoginPage(){
  const {login} = useAuth()
  const {currentOrg} = useOrganization()
  const [identifier,setIdentifier] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const navigate = useNavigate()

  async function submit(e){
    e.preventDefault()
    try{
      const res = await apiFetch('/api/v1/auth/auth/login',{
        method:'POST',
        body: JSON.stringify({ identifier, password }),
      })
      const token = res.access_token || res.token
      if(!token) throw new Error('Invalid credentials')
      
      // Parse token to get user role
      const userData = parseJwt(token)
      const userRole = userData.role
      
      // Set token in auth context
      login(token)
      
      // Get organization slug (default to 'bio-dev' if not available)
      const orgSlug = currentOrg?.slug || 'bio-dev'
      
      // Redirect based on user role
      if (userRole === 'STAFF') {
        navigate(`/${orgSlug}/staff/portal`)
      } else {
        // ADMIN and MANAGER go to dashboard
        navigate(`/${orgSlug}/dashboard`)
      }
    }catch(err){
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <h2 className="text-xl font-semibold mb-4">Sign in</h2>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <form onSubmit={submit} className="space-y-3">
            <input className="w-full border p-2 rounded" placeholder="Identifier" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
            <input type="password" className="w-full border p-2 rounded" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded w-full">Login</button>
          </form>
        </Card>
      </div>
    </div>
  )
}