import type { Metadata } from 'next';
import './globals.css';
import {settings} from './shop-data';
import {defaultSettings} from './shop-config';
export async function generateMetadata():Promise<Metadata>{const s=await settings().catch(()=>defaultSettings);return {metadataBase:new URL(s.siteUrl),title:s.seoTitle,description:s.seoDescription,alternates:{canonical:'/'},openGraph:{title:s.seoTitle,description:s.seoDescription,url:s.siteUrl,siteName:'VELTO',type:'website',images:[s.socialImage]},twitter:{card:'summary_large_image',title:s.seoTitle,description:s.seoDescription,images:[s.socialImage]},icons:{icon:'/velto-logo.png'}}}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
