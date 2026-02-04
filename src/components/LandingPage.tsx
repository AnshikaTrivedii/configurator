import React from 'react';
import { Package, ArrowRight, Zap, Monitor, Settings, Layers, Boxes } from 'lucide-react';

interface LandingPageProps {
  onStartConfiguration: () => void;
  onChooseProductDirectly: () => void;
  onSalesLogin: () => void;
  onPartnerLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartConfiguration, onChooseProductDirectly, onSalesLogin, onPartnerLogin }) => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Premium Black Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-black to-gray-900 w-full shadow-2xl border-b border-cyan-500/20 relative">
        {/* Login Buttons (top-right, aligned to viewport edge) */}
        <div className="absolute top-4 right-4 z-50">
          <div className="flex items-center gap-3">
            {/* <button
              type="button"
              onClick={onPartnerLogin}
              className="px-4 py-2 bg-slate-800/80 text-cyan-400 text-sm font-semibold rounded-lg hover:bg-slate-700/80 transition-all border border-cyan-500/20 hover:border-cyan-500/40 shadow-lg backdrop-blur-sm"
            >
              Partner Login
            </button> */}
            <button
              type="button"
              onClick={onSalesLogin}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-cyan-500/25 border border-white/10"
            >
              Sales Login
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div
            className="flex flex-col items-center justify-center gap-4 sm:gap-6 px-6 sm:px-8 lg:px-12"
            style={{
              paddingTop: '32px',
              paddingBottom: '32px',
              minHeight: '120px'
            }}
          >
            <div className="flex-shrink-0" style={{ height: '70px', display: 'flex', alignItems: 'center' }}>
              <img
                src="https://orion-led.com/wp-content/uploads/al_opt_content/IMAGE/orion-led.com/wp-content/uploads/2025/06/logo-white-1.png.bv.webp?bv_host=orion-led.com"
                alt="Orion LED Logo"
                className="w-auto h-full object-contain"
                style={{
                  height: '70px',
                  maxHeight: '75px',
                  imageRendering: 'crisp-edges',
                  display: 'block',
                  filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.5))'
                }}
              />
            </div>
            <h1
              className="text-white font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide leading-tight text-center"
              style={{
                textShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(6, 182, 212, 0.25)',
                letterSpacing: '1.5px',
                lineHeight: '1.3',
                fontFamily: 'Inter, system-ui, sans-serif',
                background: 'linear-gradient(135deg, #ffffff 0%, #06b6d4 50%, #ffffff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              ORION-LED CONFIGURATOR
            </h1>
            <p className="text-cyan-400/80 text-xs sm:text-sm font-medium tracking-wider uppercase">
              Professional LED Display Configuration Tool
            </p>
          </div>
        </div>
      </header>

      {/* Hero Section with Premium Styling */}
      <div className="relative overflow-hidden min-h-[calc(100vh-180px)] flex items-center">
        {/* Subtle Animated Background Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-400/8 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-[500px] h-[500px] bg-slate-300/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 sm:py-20">
          <div className="text-center space-y-8">
            {/* Main Heading with Enhanced Glow Effect */}
            <div className="space-y-5">
              <h2
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight"
                style={{
                  textShadow: '0 2px 20px rgba(0, 0, 0, 0.05), 0 0 30px rgba(6, 182, 212, 0.1)',
                  letterSpacing: '-0.02em'
                }}
              >
                Create Your Perfect
                <br />
                <span className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 bg-clip-text text-transparent">
                  LED Display
                </span>
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto font-normal leading-relaxed px-4">
                Design and configure your perfect LED display solution with our intuitive step-by-step tool. Get instant pricing, detailed specifications, and professional quotations.
              </p>
            </div>

            {/* Two Primary Options - Large and Impressive */}
            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 pt-10 max-w-6xl mx-auto">
              {/* Guided Configuration Option */}
              <button
                onClick={onStartConfiguration}
                className="group relative w-full lg:w-1/2 px-10 py-12 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white rounded-2xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 overflow-hidden border-2 border-slate-700/50 hover:border-cyan-500/30"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 20px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:from-cyan-500/40 group-hover:to-blue-500/40 transition-all duration-300 border-2 border-cyan-500/30 group-hover:border-cyan-400/50 shadow-lg group-hover:scale-110">
                    <Layers className="w-12 h-12 text-cyan-400 group-hover:text-cyan-300 transition-colors" strokeWidth={2} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">Guided Configuration</h3>
                    <p className="text-base text-gray-300 leading-relaxed">Step-by-step setup wizard to configure your perfect LED display</p>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    <span className="font-medium">Get Started</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              {/* Browse Products Option */}
              <button
                onClick={onChooseProductDirectly}
                className="group relative w-full lg:w-1/2 px-10 py-12 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-1 overflow-hidden border-2 border-slate-700/50 hover:border-purple-500/30"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 20px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:from-purple-500/40 group-hover:to-pink-500/40 transition-all duration-300 border-2 border-purple-500/30 group-hover:border-purple-400/50 shadow-lg group-hover:scale-110">
                    <Boxes className="w-12 h-12 text-purple-400 group-hover:text-purple-300 transition-colors" strokeWidth={2} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">Browse Products</h3>
                    <p className="text-base text-gray-300 leading-relaxed">Explore and select from our complete product catalog</p>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
                    <span className="font-medium">Browse Now</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section with Glassmorphism */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Why Choose <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Orion-LED</span>?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to make LED display configuration simple and efficient
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="group relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 border border-gray-100 hover:border-cyan-200/50 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-all duration-300 shadow-lg">
                <Monitor className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-cyan-600 transition-colors">Easy Configuration</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Step-by-step wizard guides you through dimensions, viewing distance, and product selection with intuitive controls
              </p>
            </div>
          </div>

          <div className="group relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl hover:shadow-purple-500/20 transition-all duration-300 border border-gray-100 hover:border-purple-200/50 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-all duration-300 shadow-lg">
                <Zap className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Smart Recommendations</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Get intelligent product recommendations based on your viewing distance and environment requirements
              </p>
            </div>
          </div>

          <div className="group relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl hover:shadow-blue-500/20 transition-all duration-300 border border-gray-100 hover:border-blue-200/50 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-all duration-300 shadow-lg">
                <Settings className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">Detailed Specifications</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                View complete product details, pricing, and generate professional quotations with comprehensive documentation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section with Premium Styling */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-2xl p-10 sm:p-12 lg:p-14 text-center text-white overflow-hidden shadow-xl border border-slate-700/50">
          {/* Enhanced Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.15),transparent_70%)]"></div>
            <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700/50 backdrop-blur-md rounded-2xl mb-6 shadow-lg border border-slate-600/50">
              <Package className="text-cyan-400" size={32} />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Ready to Get Started?
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Configure your LED display in minutes and get instant pricing, detailed specifications, and professional quotations
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onStartConfiguration}
                className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-700 text-lg sm:text-xl font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-white/40"
              >
                <Layers className="w-6 h-6 text-cyan-600" />
                Guided Configuration
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button
                onClick={onChooseProductDirectly}
                className="group inline-flex items-center gap-3 px-10 py-5 bg-white/20 backdrop-blur-md text-white text-lg sm:text-xl font-semibold rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-white/30"
              >
                <Boxes className="w-6 h-6 text-purple-300" />
                Browse Products
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
