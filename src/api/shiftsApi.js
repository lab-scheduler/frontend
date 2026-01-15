import { apiFetch } from './api'
import { ORG_SLUG } from '../env'

/**
 * Delete shifts by date range
 * @param {string} token - JWT token
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Deletion result with count
 */
export async function deleteShiftsByRange(token, startDate, endDate) {
    return await apiFetch(
        `/api/v1/${ORG_SLUG}/shifts/range?start_date=${startDate}&end_date=${endDate}`,
        { method: 'DELETE' },
        token
    )
}

/**
 * Fetch shifts by date range
 * @param {string} token - JWT token
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of shifts
 */
export async function fetchShiftsByRange(token, startDate, endDate) {
    return await apiFetch(
        `/api/v1/${ORG_SLUG}/shifts?start_date=${startDate}&end_date=${endDate}`,
        {},
        token
    )
}
