/**
 * Generates the OpenAPI JSON spec on disk without starting the HTTP server.
 *
 * Useful for:
 *   - Importing into Postman / Insomnia / Stoplight in CI or from a fresh checkout.
 *   - Committing a frozen spec alongside the code for review.
 *   - Generating client SDKs (openapi-generator, orval, etc.).
 *
 * Run with:  pnpm docs:export
 * Output:    backend/openapi.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { swaggerSpec } from '../src/config/swagger.js';

const outDir = path.resolve(process.cwd(), 'openapi');
mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'openapi.json');
writeFileSync(outFile, JSON.stringify(swaggerSpec, null, 2) + '\n', 'utf8');

const paths = Object.keys((swaggerSpec as { paths?: Record<string, unknown> }).paths ?? {});
const schemas = Object.keys(
  (swaggerSpec as { components?: { schemas?: Record<string, unknown> } }).components?.schemas ?? {},
);

console.log(`✅ OpenAPI spec written to ${path.relative(process.cwd(), outFile)}`);
console.log(`   Paths:   ${paths.length}`);
console.log(`   Schemas: ${schemas.length}`);
