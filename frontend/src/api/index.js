import axios from 'axios'

/*
const api = axios.create({ baseURL: '/api' })
// auth API (separate base since auth routes are mounted at /auth on the backend)
const authApi = axios.create({ baseURL: '/auth' })
*/
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: `${BASE}/api` })
const authApi = axios.create({ baseURL: `${BASE}/auth` })
export const setAuthToken = (token) => {
	if (token) {
		api.defaults.headers.common['Authorization'] = `Bearer ${token}`
		authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`
		localStorage.setItem('access_token', token)
	} else {
		delete api.defaults.headers.common['Authorization']
		delete authApi.defaults.headers.common['Authorization']
		localStorage.removeItem('access_token')
	}
}

export const loadAuthToken = () => {
	const t = localStorage.getItem('access_token')
	if (t) setAuthToken(t)
}
export const runLinearRegression   = (p) => api.post('/linear-regression',  p).then(r => r.data)
export const runLogisticRegression = (p) => api.post('/logistic-regression', p).then(r => r.data)
export const runKNN                = (p) => api.post('/knn',                 p).then(r => r.data)
export const runSVM                = (p) => api.post('/svm',                 p).then(r => r.data)
export const runDecisionTree       = (p) => api.post('/decision-tree',       p).then(r => r.data)
export const runRandomForest       = (p) => api.post('/random-forest',       p).then(r => r.data)
export const runBiasVariance       = (p) => api.post('/bias-variance',       p).then(r => r.data)
export const runCompare            = (p) => api.post('/compare',             p).then(r => r.data)
export const runGradientBoosting   = (p) => api.post('/gradient-boosting',   p).then(r => r.data)
export const runNaiveBayes         = (p) => api.post('/naive-bayes',         p).then(r => r.data)
export const runNeuralNet          = (p) => api.post('/neural-net',          p).then(r => r.data)
export const uploadCSV             = (formData) => api.post('/csv/upload', formData, { headers: {'Content-Type':'multipart/form-data'} }).then(r => r.data)
export const runCSVModel           = (p) => api.post('/csv/run',             p).then(r => r.data)

// Authentication
export const signup = (p) => authApi.post('/signup', p).then(r => r.data)
export const login  = (p) => authApi.post('/login',  p).then(r => r.data)
