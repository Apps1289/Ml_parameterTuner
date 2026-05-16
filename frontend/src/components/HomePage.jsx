import React, { useState } from 'react'
import { Menu, X, ArrowRight, Brain, Zap, BarChart3, Shield, Users, Star } from 'lucide-react'
import { login, signup, setAuthToken } from '../api'

export default function HomePage({ onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('access_token')))
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [pendingGetStarted, setPendingGetStarted] = useState(false)
  const [authForm, setAuthForm] = useState({ email: '', password: '', full_name: '' })

  const openLogin = () => {
    setAuthMode('login')
    setAuthError('')
    setAuthOpen(true)
  }

  const openSignup = () => {
    setAuthMode('signup')
    setAuthError('')
    setAuthOpen(true)
  }

  const handleGetStartedClick = () => {
    if (isAuthenticated) {
      if (onGetStarted) onGetStarted()
      return
    }

    setPendingGetStarted(true)
    setAuthMode('signup')
    setAuthError('')
    setAuthOpen(true)
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      if (authMode === 'signup') {
        await signup({
          email: authForm.email,
          password: authForm.password,
          full_name: authForm.full_name || null,
        })
      }

      const authResp = await login({
        email: authForm.email,
        password: authForm.password,
      })

      setAuthToken(authResp.access_token)
      setIsAuthenticated(true)
      setAuthOpen(false)
      if (pendingGetStarted && onGetStarted) {
        onGetStarted()
      }
      setPendingGetStarted(false)
    } catch (err) {
      setAuthError(err?.response?.data?.detail || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthToken(null)
    setIsAuthenticated(false)
    setAuthOpen(false)
    setAuthError('')
    setAuthForm({ email: '', password: '', full_name: '' })
    setPendingGetStarted(false)
  }

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'Interactive ML Models',
      desc: 'Visualize and experiment with 9+ machine learning algorithms in real-time'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Hyperparameter Tuning',
      desc: 'Adjust parameters and see instant visualization of model behavior'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Advanced Analytics',
      desc: 'Compare models, analyze bias-variance tradeoff, and export results'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'CSV Data Support',
      desc: 'Upload your own datasets and train models with custom data'
    }
  ]

  const services = [
    { name: 'Linear Regression', icon: '📈' },
    { name: 'Logistic Regression', icon: '🔵' },
    { name: 'KNN Algorithm', icon: '📍' },
    { name: 'Support Vector Machines', icon: '📐' },
    { name: 'Decision Trees', icon: '🌲' },
    { name: 'Random Forests', icon: '🌳' },
    { name: 'Gradient Boosting', icon: '🚀' },
    { name: 'Neural Networks', icon: '🧠' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation Bar */}
      <nav className="fixed w-full top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold">
                🧠
              </div>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                ML ParameterTuner
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-slate-300 hover:text-white transition duration-200 font-medium">Home</a>
              <a href="#features" className="text-slate-300 hover:text-white transition duration-200 font-medium">Features</a>
              <a href="#services" className="text-slate-300 hover:text-white transition duration-200 font-medium">Services</a>
              <a href="#contact" className="text-slate-300 hover:text-white transition duration-200 font-medium">Contact</a>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="px-6 py-2 text-red-400 hover:text-red-300 font-medium transition duration-200">
                  Logout
                </button>
              ) : (
                <>
                  <button onClick={openLogin} className="px-6 py-2 text-blue-400 hover:text-blue-300 font-medium transition duration-200">
                    Sign In
                  </button>
                  <button onClick={openSignup} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition duration-200">
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-300 hover:text-white transition"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-slate-800">
              <a href="#home" className="block py-2 text-slate-300 hover:text-white">Home</a>
              <a href="#features" className="block py-2 text-slate-300 hover:text-white">Features</a>
              <a href="#services" className="block py-2 text-slate-300 hover:text-white">Services</a>
              <a href="#contact" className="block py-2 text-slate-300 hover:text-white">Contact</a>
              <div className="flex gap-2 mt-4">
                {isAuthenticated ? (
                  <button onClick={handleLogout} className="flex-1 px-4 py-2 text-red-400 border border-red-400 rounded-lg">Logout</button>
                ) : (
                  <>
                    <button onClick={openLogin} className="flex-1 px-4 py-2 text-blue-400 border border-blue-400 rounded-lg">Sign In</button>
                    <button onClick={openSignup} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">Sign Up</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium">
              ✨ Welcome to ML ParameterTuner
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Master Machine <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Learning Visually
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            An interactive laboratory to experiment with 9+ machine learning algorithms. Visualize hyperparameter effects in real-time, compare models, and master ML concepts through hands-on exploration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button 
              onClick={handleGetStartedClick}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition duration-200 flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight size={20} />
            </button>
            <button className="px-8 py-3 border border-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-800/50 transition duration-200">
              Watch Demo
            </button>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur">
              <div className="grid grid-cols-3 gap-4 h-64 bg-slate-800/30 rounded-xl p-4">
                <div className="bg-gradient-to-b from-blue-500/20 to-transparent rounded-lg flex items-end justify-center pb-4">
                  <div className="w-12 h-24 bg-blue-500/50 rounded-t-lg"></div>
                </div>
                <div className="bg-gradient-to-b from-purple-500/20 to-transparent rounded-lg flex items-end justify-center pb-4">
                  <div className="w-12 h-32 bg-purple-500/50 rounded-t-lg"></div>
                </div>
                <div className="bg-gradient-to-b from-pink-500/20 to-transparent rounded-lg flex items-end justify-center pb-4">
                  <div className="w-12 h-20 bg-pink-500/50 rounded-t-lg"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-400">9+</div>
              <p className="text-slate-400 text-sm sm:text-base">ML Algorithms</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-purple-400">100%</div>
              <p className="text-slate-400 text-sm sm:text-base">Interactive</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-pink-400">Real-time</div>
              <p className="text-slate-400 text-sm sm:text-base">Visualization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-400">Everything you need to master machine learning</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="group p-8 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-blue-500/50 transition duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 text-white group-hover:scale-110 transition duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Available Algorithms</h2>
            <p className="text-xl text-slate-400">Explore and experiment with various ML models</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service, idx) => (
              <div 
                key={idx}
                className="group p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl hover:border-purple-500/50 transition duration-300 text-center cursor-pointer hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="text-4xl mb-3">{service.icon}</div>
                <p className="text-slate-300 font-medium group-hover:text-white transition">{service.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border-y border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">Ready to Explore ML?</h2>
          <p className="text-xl text-slate-400 mb-8">Start experimenting with interactive visualizations today. No coding required.</p>
          <button 
            onClick={handleGetStartedClick}
            className="px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition duration-200 text-lg"
          >
            Launch ML ParameterTuner <ArrowRight size={22} className="inline ml-2" />
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="text-xl text-slate-400">Questions or feedback? We'd love to hear from you</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-white mb-2">Email</h3>
              <p className="text-slate-400">support@mlexplorer.dev</p>
            </div>
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-white mb-2">Chat</h3>
              <p className="text-slate-400">Live chat support available</p>
            </div>
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-lg font-semibold text-white mb-2">Social</h3>
              <p className="text-slate-400">Follow us on social media</p>
            </div>
          </div>

          <form className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Your Name" 
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input 
                type="email" 
                placeholder="Your Email" 
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <textarea 
              placeholder="Your Message" 
              rows="5"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-4"
            ></textarea>
            <button 
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition duration-200"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                🧠
              </div>
              <span className="font-bold text-white">ML Explorer</span>
            </div>
            <p className="text-slate-400 text-center md:text-right">© 2024 ML Explorer. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {authOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-1">{authMode === 'login' ? 'Sign In' : 'Sign Up'}</h3>
            <p className="text-slate-400 mb-6 text-sm">
              {authMode === 'login' ? 'Login to continue to ML Explorer' : 'Create your account to continue'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={authForm.full_name}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />

              {authError && <p className="text-red-400 text-sm">{authError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthOpen(false); setPendingGetStarted(false); }}
                  className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg disabled:opacity-60"
                >
                  {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </form>

            <button
              onClick={() => {
                setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'))
                setAuthError('')
              }}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
            >
              {authMode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
