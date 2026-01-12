export function getEnvVar(name, fallback) {
  if (typeof window !== 'undefined' && window.__ENV && window.__ENV[name] !== undefined)
    return window.__ENV[name]
  if (typeof window !== 'undefined' && window[name] !== undefined)
    return window[name]
  if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined)
    return process.env[name]
  return fallback
}
export const OPENAPI_BASE = getEnvVar('VITE_REACT_APP_API_BASE', 'https://rpawe9zvpj.ap-southeast-1.awsapprunner.com')

export const ORG_SLUG = getEnvVar('VITE_REACT_APP_ORG_SLUG', 'bio-dev')
