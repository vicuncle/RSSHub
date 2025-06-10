import path from 'node:path';
import fs from 'node:fs';
import { getCurrentPath } from '../../lib/utils/helpers';

const __dirname = getCurrentPath(import.meta.url);

fs.mkdirSync(path.join(__dirname, '../../assets/build'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../../assets/build/routes.js'), 'export default {}');
fs.writeFileSync(path.join(__dirname, '../../assets/build/routes.json'), '{}'); 