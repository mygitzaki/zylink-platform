export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Zylike-inspired Design System
      colors: {
        // Brand Colors (Purple/Blue theme like Zylike)
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe', 
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Primary blue
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49'
        },
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff', 
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7', // Primary purple
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764'
        },
        // Glass/Transparent variations
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          'white-20': 'rgba(255, 255, 255, 0.2)',
          'white-5': 'rgba(255, 255, 255, 0.05)',
          dark: 'rgba(0, 0, 0, 0.1)',
          'dark-20': 'rgba(0, 0, 0, 0.2)',
        }
      },
      
      // Custom gradients (Zylike style)
      backgroundImage: {
        'gradient-zylike': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1f2937 0%, #000000 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      
      // Enhanced backdrop blur
      backdropBlur: {
        xs: '2px',
      },
      
      // Enhanced shadows (glassmorphism)
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'zylike': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      },
      
      // Mobile-first breakpoints (same as Tailwind but explicit)
      screens: {
        'xs': '475px',
        // sm: '640px' (default)
        // md: '768px' (default)  
        // lg: '1024px' (default)
        // xl: '1280px' (default)
        '2xl': '1536px', // (default)
      },
      
      // Enhanced spacing for touch targets
      spacing: {
        '18': '4.5rem', // 72px
        '88': '22rem',  // 352px
      },
      
      // Enhanced border radius (more modern)
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      
      // Enhanced font sizes
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      
      // Enhanced transitions (smooth like Zylike)
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      
      // Enhanced z-index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Enhanced animations for Zylike feel
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        fadeIn: 'fadeIn 0.3s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out'
      }
    },
  },
  plugins: [],
};







