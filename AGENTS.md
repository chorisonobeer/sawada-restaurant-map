# Repository Guidelines

## Project Structure & Module Organization
Niigata Craft Beer Map lives in `src/`, with screen-level views under `src/App/`, shared hooks and data utilities in `src/lib/`, and reusable helpers in `src/utils/`. Co-locate styles beside components (`Home.tsx` + `Home.scss`) and keep runtime assets in `public/`. Jest specs sit next to their targets as `ComponentName.test.tsx` files. Generated configuration such as `src/config.json` comes from the scripts in `bin/`, long-form references belong in `docs/`, and production bundles emit into `build/`.

## Build, Test, and Development Commands
Install dependencies once via `npm install` or `npm ci`. Run `npm start` to generate config with `bin/config.js` and launch the CRA dev server at http://localhost:3000. Use `npm run build` or `npm run build:clean` before releases to refresh version metadata and write the optimized bundle into `build/`. When icons change, invoke `npm run build:assets` to regenerate the PWA icon assets. Execute `npm test` for interactive Jest, or `CI=true npm test -- --watch=false` in pipelines to avoid watch mode.

## Coding Style & Naming Conventions
Honor `.editorconfig`: two-space indentation, LF endings, UTF-8, and trimmed trailing whitespace. TypeScript components use PascalCase filenames, utilities expose camelCase helpers, and SCSS modules mirror their component names. Prefer function components with hooks, keep JSX within 120 columns, and rely on CRA's ESLint during builds; resolve warnings before pushing commits.

## Testing Guidelines
Tests run on Jest with React Testing Library as configured in `setupTests.ts`. Name specs `ComponentName.test.tsx`, mock map providers as needed, and aim to cover shop filtering, map clustering, and config parsing flows when you introduce features. Run suites locally with `npm test` prior to opening a pull request.

## Commit & Pull Request Guidelines
Match the existing Conventional Commit style (for example, `feat: add cluster legend`), keeping messages in the imperative mood. Pull requests should include a concise summary, link relevant GitHub issues, and attach screenshots or GIFs for UI updates. Call out any config or asset migrations, and confirm `npm run build` plus the relevant tests pass before requesting review. Maintain the mixed Japanese/English tone already present in history when appropriate.

## Configuration Tips
Do not hand-edit `src/config.json`; instead adjust `.env` or `config.yml` and rerun the generators in `bin/`. Keep environment secrets out of version control, and regenerate local config whenever backend endpoints or map tokens change.
