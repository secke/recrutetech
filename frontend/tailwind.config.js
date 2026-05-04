/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef4ff',
                    100: '#dae6ff',
                    200: '#bcd2ff',
                    300: '#8db4ff',
                    400: '#5c8cff',
                    500: '#3b66ff',
                    600: '#2545f5',
                    700: '#1e35d9',
                    800: '#1d2fae',
                    900: '#1e2d87',
                    950: '#141c52',
                },
                ink: {
                    50: '#f6f7fb',
                    100: '#eceef6',
                    200: '#d6d9e7',
                    300: '#b2b7cf',
                    400: '#888eb0',
                    500: '#6b7094',
                    600: '#545878',
                    700: '#434663',
                    800: '#2a2d44',
                    900: '#1a1c2e',
                    950: '#0b0c18',
                },
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                glow: '0 0 40px -10px rgba(92, 140, 255, 0.55)',
                'glow-lg': '0 0 80px -10px rgba(168, 85, 247, 0.45)',
            },
            backgroundImage: {
                'grid-pattern':
                    "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
                'radial-fade':
                    'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25), transparent 60%)',
            },
            keyframes: {
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-ring': {
                    '0%': { transform: 'scale(0.8)', opacity: '0.7' },
                    '100%': { transform: 'scale(2)', opacity: '0' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.6s ease-out forwards',
                'pulse-ring': 'pulse-ring 2s ease-out infinite',
                'float-slow': 'float-slow 6s ease-in-out infinite',
                'shimmer': 'shimmer 3s linear infinite',
            },
        },
    },
    plugins: [],
}
