import React,{useEffect,useState} from 'react'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
export default function StaffListPage(){
  const { token } = useAuth()
  const [staff,setStaff] = useState(null)
  useEffect(()=>{
    apiFetch((`/api/v1/${ORG_SLUG}/staff`, {}, token)).then(r=>setStaff(r)).catch(()=>setStaff([]))
  },[])
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Staff</h2>
      <Card>
        {!staff && <LoadingSkeleton className="h-10 w-full" />}
        {staff && (
          <table className="w-full text-sm">
            <thead><tr><th>ID</th><th>Name</th><th>Role</th></tr></thead>
            <tbody>
              {staff.map((s,i)=>(
                <tr key={i} className="border-t"><td>{s.employee_id}</td><td>{s.full_name}</td><td>{s.role}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
