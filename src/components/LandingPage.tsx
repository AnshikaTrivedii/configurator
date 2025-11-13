import React from 'react';
import { Package, ArrowRight, Zap, Monitor, Settings, LogIn, Sparkles, Star } from 'lucide-react';

interface LandingPageProps {
  onStartConfiguration: () => void;
  onSalesLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartConfiguration, onSalesLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Premium Black Header */}
      <header className="bg-black w-full shadow-2xl border-b border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div 
            className="flex items-center gap-6 sm:gap-8 px-6 sm:px-8 lg:px-12"
            style={{
              paddingTop: '24px',
              paddingBottom: '24px',
              minHeight: '90px'
            }}
          >
            <div className="flex-shrink-0" style={{ height: '85px', display: 'flex', alignItems: 'center' }}>
              <img 
                src="https://orion-led.com/wp-content/uploads/al_opt_content/IMAGE/orion-led.com/wp-content/uploads/2025/06/logo-white-1.png.bv.webp?bv_host=orion-led.com"
                alt="Orion LED Logo"
                className="w-auto h-full object-contain"
                style={{ 
                  height: '85px',
                  maxHeight: '90px',
                  imageRendering: 'crisp-edges',
                  display: 'block'
                }}
              />
            </div>
            <h1 
              className="text-white font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight"
              style={{
                textShadow: '0 0 30px rgba(6, 182, 212, 0.4), 0 0 60px rgba(6, 182, 212, 0.2), 0 0 90px rgba(6, 182, 212, 0.1)',
                letterSpacing: '1px',
                lineHeight: '1.1',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              LED DISPLAY CONFIGURATOR
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section with Premium Styling */}
      <div className="relative overflow-hidden min-h-[calc(100vh-90px)] flex items-center">
        {/* Animated Background Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="text-center space-y-8">
            {/* Main Heading with Glow Effect */}
            <div className="space-y-4">
              <h2 
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 leading-tight"
                style={{
                  textShadow: '0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(6, 182, 212, 0.15)',
                  letterSpacing: '-0.02em'
                }}
              >
                Create Your Perfect
                <br />
                <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  LED Display
                </span>
              </h2>
              <p className="text-xl sm:text-2xl md:text-3xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed">
                Design and configure your perfect LED display solution with our intuitive step-by-step tool
              </p>
            </div>

            {/* Modern Glowing Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-8">
              <button
                onClick={onStartConfiguration}
                className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden"
                style={{
                  boxShadow: '0 10px 40px rgba(6, 182, 212, 0.4), 0 0 20px rgba(139, 92, 246, 0.3)'
                }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Star className="w-6 h-6 fill-current" />
                  Start Configuration
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section with Glassmorphism */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:border-cyan-200/50 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Monitor className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Easy Configuration</h3>
            <p className="text-gray-600 leading-relaxed">
              Step-by-step wizard guides you through dimensions, viewing distance, and product selection
            </p>
          </div>

          <div className="group bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:border-purple-200/50 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Zap className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Recommendations</h3>
            <p className="text-gray-600 leading-relaxed">
              Get product recommendations based on your viewing distance and environment requirements
            </p>
          </div>

          <div className="group bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:border-blue-200/50 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Settings className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Detailed Specifications</h3>
            <p className="text-gray-600 leading-relaxed">
              View complete product details, pricing, and generate professional quotations
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section with Premium Styling */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-3xl p-12 sm:p-16 text-center text-white overflow-hidden shadow-2xl">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
              <Package className="text-white" size={40} />
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl sm:text-2xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Configure your LED display in minutes and get instant pricing and specifications
            </p>
            <button
              onClick={onStartConfiguration}
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 text-lg sm:text-xl font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 shadow-2xl hover:shadow-white/50 transform hover:scale-105"
            >
              Start Configuration
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Sales Login Section with Premium Styling */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="text-center">
          <div className="inline-block">
            <button
              onClick={onSalesLogin}
              className="group relative px-8 py-4 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white text-base sm:text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden border border-slate-600/50"
              style={{
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(6, 182, 212, 0.2)'
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Sales Login
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
