import {products,settings} from './shop-data';
export const dynamic='force-dynamic';
export default async function sitemap(){const [s,p]=await Promise.all([settings(),products()]);return [{url:s.siteUrl,changeFrequency:'weekly' as const,priority:1},...p.map(x=>({url:s.siteUrl+'/products/'+x.id,changeFrequency:'weekly' as const,priority:0.8}))]}
