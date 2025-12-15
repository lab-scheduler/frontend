import React,{useState} from 'react'
import Card from '../components/Card'
import { apiFetch } from '../api/api'
import { ORG_SLUG } from '../env'
import { useAuth } from '../context/AuthContext'
export default function DataEntryPage(){
  const { token } = useAuth()
  const [entity,setEntity] = useState('staff')
  const [payload,setPayload] = useState('{}')
  const [result,setResult] = useState(null)
  async function submit(){
    try{
      const map={staff:`/${ORG_SLUG}/staff`,skill:`/${ORG_SLUG}/skills`,shift:`/${ORG_SLUG}/schedule`}
      const res = await apiFetch(map[entity],{method:'POST',body:payload},token)
      setResult(res)
    }catch(err){ setResult({error:err.message}) }
  }
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Data Entry</h2>
      <Card>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Entity</label>
            <select value={entity} onChange={e=>setEntity(e.target.value)} className="border p-2 w-full rounded">
              <option value="staff">Staff</option>
              <option value="skill">Skill</option>
              <option value="shift">Shift</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm">JSON Payload</label>
            <textarea rows={6} className="border p-2 w-full rounded" value={payload} onChange={e=>setPayload(e.target.value)}></textarea>
          </div>
          <div className="col-span-3 text-right">
            <button onClick={submit} className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
          </div>
          {result && <pre className="col-span-3 bg-gray-100 p-3 rounded text-xs">{JSON.stringify(result,null,2)}</pre>}
        </div>
      </Card>
    </div>
  )
}