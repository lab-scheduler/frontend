import React,{useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuth} from '../context/AuthContext'
import {apiFetch} from '../api/api'
import Card from '../components/Card'
export default function LoginPage(){
  const {login} = useAuth()
  const [identifier,setIdentifier] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const navigate = useNavigate()

  async function submit(e){
    e.preventDefault()
    try{
      const res = await apiFetch('/api/v1/auth/auth/login',{
        method:'POST', 
        body: { identifier, password, },
      })
      const token = res.access_token || res.token
      if(!token) throw new Error('Invalid credentials')
      login(token)
      navigate('/')
    }catch(err){ setError(err.message) }
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