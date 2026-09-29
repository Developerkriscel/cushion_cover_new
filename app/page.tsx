import Store from './store';
import {settings,products} from './shop-data';
import {defaultSettings} from './shop-config';
import {initialProducts} from './catalog';
export const dynamic='force-dynamic';
export default async function Home(){const [s,p]=await Promise.all([settings().catch(()=>defaultSettings),products().catch(()=>initialProducts)]);return <Store initialSettings={s} initialCatalog={p}/>}
