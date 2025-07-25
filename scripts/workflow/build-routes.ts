import { namespaces } from '../../lib/registry';
import { RadarItem } from '../../lib/types';
import { parse } from 'tldts';
import fs from 'node:fs';
import path from 'node:path';
import toSource from 'tosource';

import { getCurrentPath } from '../../lib/utils/helpers';
const __dirname = getCurrentPath(import.meta.url);

let foloAnalysisTop100: [string, any][] = [];

try {
    const foloAnalysis = await (
        await fetch('https://api.follow.is/discover/rsshub-analytics', {
            headers: {
                'user-agent': 'RSSHub',
            },
        })
    ).json();
    const foloAnalysisResult = foloAnalysis.data as Record<string, { subscriptionCount: number; topFeeds: any[] }>;
    foloAnalysisTop100 = Object.entries(foloAnalysisResult)
        .sort((a, b) => b[1].subscriptionCount - a[1].subscriptionCount)
        .slice(0, 150);
} catch (e) {
    console.warn('Failed to fetch analytics data, skipping popular tag generation:', e);
}

const maintainers: Record<string, string[]> = {};
type RadarDomain = {
    _name: string;
} & {
    [subdomain: string]: RadarItem[];
};
const radar: Record<string, RadarDomain> = {};

for (const namespace in namespaces) {
    let defaultCategory = namespaces[namespace].categories?.[0];
    if (!defaultCategory) {
        for (const path in namespaces[namespace].routes) {
            if (namespaces[namespace].routes[path].categories) {
                defaultCategory = namespaces[namespace].routes[path].categories[0];
                break;
            }
        }
    }
    if (!defaultCategory) {
        defaultCategory = 'other';
    }
    for (const path in namespaces[namespace].routes) {
        const realPath = `/${namespace}${path}`;
        const data = namespaces[namespace].routes[path];
        const categories = data.categories || namespaces[namespace].categories || [defaultCategory];
        if (foloAnalysisTop100.some(([path]) => path === realPath)) {
            categories.push('popular');
        }
        // maintainers
        if (data.maintainers) {
            maintainers[realPath] = data.maintainers;
        }
        // radar
        if (data.radar?.length) {
            for (const radarItem of data.radar) {
                const parsedDomain = parse(new URL('https://' + radarItem.source[0]).hostname);
                const subdomain = parsedDomain.subdomain || '.';
                const domain = parsedDomain.domain;
                if (domain) {
                    if (!radar[domain]) {
                        radar[domain] = {
                            _name: namespaces[namespace].name,
                        } as RadarDomain;
                    }
                    if (!radar[domain][subdomain]) {
                        radar[domain][subdomain] = [];
                    }
                    radar[domain][subdomain].push({
                        title: radarItem.title || data.name,
                        docs: `https://docs.rsshub.app/routes/${categories[0]}`,
                        source: radarItem.source.map((source) => {
                            const sourceURL = new URL('https://' + source);
                            return sourceURL.pathname + sourceURL.search + sourceURL.hash;
                        }),
                        target: radarItem.target ? `/${namespace}${radarItem.target}` : realPath,
                    });
                }
            }
        }
        data.module = `() => import('@/routes/${namespace}/${data.location}')`;
    }
    for (const path in namespaces[namespace].apiRoutes) {
        const data = namespaces[namespace].apiRoutes[path];
        data.module = `() => import('@/routes/${namespace}/${data.location}')`;
    }
}

fs.writeFileSync(path.join(__dirname, '../../assets/build/radar-rules.json'), JSON.stringify(radar, null, 2));
fs.writeFileSync(path.join(__dirname, '../../assets/build/radar-rules.js'), `(${toSource(radar)})`);
fs.writeFileSync(path.join(__dirname, '../../assets/build/maintainers.json'), JSON.stringify(maintainers, null, 2));
fs.writeFileSync(path.join(__dirname, '../../assets/build/routes.json'), JSON.stringify(namespaces, null, 2));
fs.writeFileSync(path.join(__dirname, '../../assets/build/routes.js'), `export default ${JSON.stringify(namespaces, null, 2)}`.replaceAll(/"module": "(.*)"\n/g, `"module": $1\n`));
