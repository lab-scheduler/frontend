import { OPENAPI_BASE } from '../env'
export async function apiFetch(path, opts={}, token=null){
  const headers = opts.headers || {}
  if(!headers['Content-Type'] && !(opts.body instanceof FormData)) headers['Content-Type']='application/json'

  // Build URL with token as query parameter (backend expects token in query, not header)
  let url = `${OPENAPI_BASE}${path}`
  if(token) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}token=${encodeURIComponent(token)}`
    // Also include Authorization header in case backend checks both
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {...opts, headers})
  if(res.status === 401) throw new Error("Unauthorized")
  if(res.status === 403) {
    const errorText = await res.text()
    try {
      const errorObj = JSON.parse(errorText)
      if(errorObj.detail === "Not authenticated") {
        throw new Error("Authentication failed. Please login again.")
      }
    } catch {}
    throw new Error(`Access denied: ${errorText}`)
  }
  const ct = res.headers.get('content-type')||''
  return ct.includes('application/json') ? res.json() : res.text()
}