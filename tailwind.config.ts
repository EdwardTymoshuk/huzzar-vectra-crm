import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', 'class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: 'hsl(var(--primary))',
  			'primary-hover': 'hsl(var(--primary-hover))',
  			'primary-foreground': 'hsl(var(--primary-foreground))',
  			secondary: 'hsl(var(--secondary))',
  			'secondary-hover': 'hsl(var(--secondary-hover))',
  			'secondary-foreground': 'hsl(var(--secondary-foreground))',
  			muted: 'hsl(var(--muted))',
  			'muted-foreground': 'hsl(var(--muted-foreground))',
  			accent: 'hsl(var(--accent))',
  			'accent-foreground': 'hsl(var(--accent-foreground))',
  			destructive: 'hsl(var(--destructive))',
  			'destructive-hover': 'hsl(var(--destructive-hover))',
  			'destructive-foreground': 'hsl(var(--destructive-foreground))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			success: 'hsl(90, 100%, 40%)',
  			warning: 'hsl(45, 100%, 50%)',
  			danger: 'hsl(10, 90%, 45%)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
