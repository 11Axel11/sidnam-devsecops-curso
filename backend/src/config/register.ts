import { join } from 'path';
require('tsconfig-paths').register({ baseUrl: join(__dirname, '..'), paths: { 'src/*': ['*'] } });
