import {settings} from './shop-data';
export default async function robots(){const s=await settings();return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/']},sitemap:s.siteUrl+'/sitemap.xml'}}
