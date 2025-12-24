import { apiFetch } from './api'
import { ORG_SLUG } from '../env'

/**
 * Fetch all shift templates for the organization
 * @param {string} token - JWT token
 * @param {boolean} activeOnly - Filter to only active templates (default: true)
 * @returns {Promise<Array>} Array of template objects
 */
export async function fetchTemplates(token, activeOnly = true) {
    const queryParam = activeOnly ? '?active_only=true' : '?active_only=false'
    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates${queryParam}`, {}, token)
}

/**
 * Fetch a single shift template by ID
 * @param {string} token - JWT token
 * @param {number} templateId - Template ID
 * @returns {Promise<Object>} Template object
 */
export async function fetchTemplate(token, templateId) {
    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates/${templateId}`, {}, token)
}

/**
 * Create a new shift template
 * @param {string} token - JWT token
 * @param {Object} templateData - Template data {name, description, config}
 * @returns {Promise<Object>} Created template object
 */
export async function createTemplate(token, templateData) {
    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
    }, token)
}

/**
 * Update an existing shift template
 * @param {string} token - JWT token
 * @param {number} templateId - Template ID
 * @param {Object} updates - Fields to update {name, description, config, is_active}
 * @returns {Promise<Object>} Updated template object
 */
export async function updateTemplate(token, templateId, updates) {
    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates/${templateId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    }, token)
}

/**
 * Delete (soft delete) a shift template
 * @param {string} token - JWT token
 * @param {number} templateId - Template ID
 * @returns {Promise<Object>} Success response {ok: true, deleted: true}
 */
export async function deleteTemplate(token, templateId) {
    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates/${templateId}`, {
        method: 'DELETE'
    }, token)
}

/**
 * Apply a template to generate shifts for a date range
 * @param {string} token - JWT token
 * @param {number} templateId - Template ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} overrides - Optional config overrides
 * @returns {Promise<Object>} Application result with summary
 */
export async function applyTemplate(token, templateId, startDate, endDate, overrides = null) {
    const payload = {
        start_date: startDate,
        end_date: endDate
    }

    if (overrides) {
        payload.overrides = overrides
    }

    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates/${templateId}/apply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }, token)
}

/**
 * Create a template from historical shift data
 * @param {string} token - JWT token
 * @param {Object} historyData - {name, description, source_start_date, source_end_date, department_id}
 * @returns {Promise<Object>} Created template object
 */
export async function createTemplateFromHistory(token, historyData) {
    return await apiFetch(`/api/v1/${ORG_SLUG}/shift-templates/from-history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(historyData)
    }, token)
}
