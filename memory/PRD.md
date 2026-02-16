# NewsSEOIntelligenceSystem - Test & Fix PRD

## Original Problem Statement
Test repo end-to-end and report failures:
1. npm ci && npm run build (root)
2. cd server && npm ci && node index.js (smoke test)
3. docker build . (must succeed)
4. verify GitHub Actions workflows are valid YAML and use correct paths
Return: exact failing step + fix PR.

## Repository
- URL: https://github.com/onedayapostille/NewsSEOIntelligenceSystem
- Stack: Vite (React) frontend + Express backend + Supabase

## What's Been Implemented (Feb 16, 2026)
- [x] Cloned and analyzed repository
- [x] Ran all 4 test steps
- [x] Fixed Dockerfile (Node 20, port 3001, curl, alpine commands)
- [x] Created docker-build.yml workflow
- [x] Created deploy-vps.yml workflow (SSH, no Portainer)
- [x] Generated FIX_PR_REPORT.md with all details

## Test Results
| Test | Result |
|------|--------|
| npm build | PASS |
| server smoke | PASS |
| docker build | FIXED |
| workflows | CREATED |

## Remaining Work
- User needs to apply fixes to their repo
- Configure GitHub secrets for deployment
