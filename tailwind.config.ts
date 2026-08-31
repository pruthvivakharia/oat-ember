import type {Config} from 'tailwindcss';
const config:Config={content:['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./store/**/*.{js,ts,jsx,tsx,mdx}'],theme:{extend:{colors:{espresso:'#12100E',oat:'#F5EBE6',matcha:'#4E6E58',terracotta:'#E05A47',ink:'#211C18'},fontFamily:{sans:['var(--font-inter)','sans-serif'],display:['var(--font-space-grotesk)','sans-serif']},boxShadow:{editorial:'8px 8px 0 rgba(0,0,0,.25)'}}},plugins:[]};
export default config;
