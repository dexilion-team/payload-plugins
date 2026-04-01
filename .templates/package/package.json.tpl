{
  "name": "@dexilion/{{ packageName }}",
  "version": "{{ lastCompatiblePayloadCMSVersion }}",
  "description": "{{ packageDescription }}",
  "author": "Dexilion",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "sideEffects": [
    "*.scss",
    "*.css"
  ],
  "peerDependencies": {
    "payload": "{{ lastCompatiblePayloadCMSVersion }}",
    "@payloadcms/ui": "{{ lastCompatiblePayloadCMSVersion }}"
  },
  "engines": {
    "node": "^18.20.2 || >=20.9.0",
    "pnpm": "^9 || ^10"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@payloadcms/db-mongodb": "{{ lastCompatiblePayloadCMSVersion }}",
    "@payloadcms/db-postgres": "{{ lastCompatiblePayloadCMSVersion }}",
    "@payloadcms/db-sqlite": "{{ lastCompatiblePayloadCMSVersion }}",
    "@payloadcms/eslint-config": "3.9.0",
    "@payloadcms/next": "{{ lastCompatiblePayloadCMSVersion }}",
    "@payloadcms/richtext-lexical": "{{ lastCompatiblePayloadCMSVersion }}",
    "@payloadcms/ui": "{{ lastCompatiblePayloadCMSVersion }}",
    "@playwright/test": "1.58.2",
    "@swc-node/register": "1.10.9",
    "@swc/cli": "0.6.0",
    "@types/node": "22.19.9",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "copyfiles": "2.4.1",
    "cross-env": "^7.0.3",
    "eslint": "^10.1.0",
    "eslint-config-next": "16.2.2",
    "graphql": "^16.8.1",
    "mongodb-memory-server": "10.1.4",
    "monaco-editor": ">= 0.25.0 < 1",
    "next": "16.2.1",
    "npm-run-all2": "^8",
    "open": "^10.1.0",
    "payload": "{{ lastCompatiblePayloadCMSVersion }}",
    "prettier": "^3.4.2",
    "qs-esm": "7.0.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "rimraf": "6.1.3",
    "sharp": "^0.34.5",
    "sort-package-json": "^2.10.0",
    "typescript": "5.9.3",
    "vite-tsconfig-paths": "6.0.5",
    "vitest": "4.1.2"
  },
  "scripts": {
"build": "run-s copyfiles build:types build:swc",
    "build:swc": "swc ./src -d ./dist --config-file .swcrc --strip-leading-paths",
    "build:types": "tsc --outDir dist --rootDir ./src",
    "clean": "rimraf {dist,*.tsbuildinfo}",
    "copyfiles": "copyfiles -u 1 \"src/**/*.{html,css,scss,ttf,woff,woff2,eot,svg,jpg,png,json}\" dist/",
    "dev": "next dev dev --turbo",
    "dev:generate-importmap": "pnpm dev:payload generate:importmap",
    "dev:generate-types": "pnpm dev:payload generate:types",
    "dev:payload": "cross-env PAYLOAD_CONFIG_PATH=./dev/payload.config.ts payload",
    "generate:importmap": "pnpm dev:generate-importmap",
    "generate:types": "pnpm dev:generate-types",
    "lint": "eslint",
    "lint:fix": "eslint ./src --fix",
    "test": "pnpm test:int && pnpm test:e2e",
    "test:e2e": "playwright test",
    "test:int": "vitest"
  },
  "files": [
    "dist",
    "LICENSE",
    "README.md",
    "!**/*.tsbuildinfo"
  ],
  "publishConfig": {
    "exports": {
      ".": {
        "import": "./dist/index.js",
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    },
    "main": "./dist/index.js",
    "registry": "https://registry.npmjs.org/",
    "types": "./dist/index.d.ts"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "sharp",
      "esbuild",
      "unrs-resolver"
    ]
  },
}
