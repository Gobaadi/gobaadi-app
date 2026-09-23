# Neon DB → AWS Aurora RDS Migration Guide

## Current Stack

- **ORM:** TypeORM (`@nestjs/typeorm`)
- **Driver:** `pg` (node-postgres)
- **DB:** PostgreSQL on Neon (connection pooler)
- **Entities:** 53 entity files
- **Migrations:** None (uses `synchronize: true`)

## Why Zero Code Changes

No Neon-specific packages (`@neondatabase/serverless`) are used. Aurora RDS is PostgreSQL-compatible. The app connects via standard TCP through `pg` driver — only connection credentials change.

---

## Step 1: Create Aurora RDS Cluster

1. AWS Console → RDS → Create database
2. Engine: **Amazon Aurora (PostgreSQL-Compatible)**
3. Engine version: **PostgreSQL 15.x** or later
4. Template: **Dev/Test** (low cost) or **Production**
5. Settings:
   - Cluster identifier: `gobadi-aurora`
   - Master username: `postgres`
   - Master password: (generate strong password)
6. Instance config:
   - Serverless v2: min 0.5 ACU, max 2 ACU (cost-effective)
   - OR db.t4g.medium (fixed, ~$30/mo)
7. Connectivity:
   - VPC: default or custom
   - **Public access:** Yes (if connecting from outside VPC)
   - Security group: allow inbound TCP 5432 from your IP
8. Database: `gobadi`
9. Note the **cluster endpoint** (e.g. `gobadi-aurora.cluster-xxxx.us-east-1.rds.amazonaws.com`)

---

## Step 2: Migrate Data from Neon

### Dump Neon data
```bash
pg_dump -h <neon-host> -U neondb_owner -d neondb -Fc -f gobadi_dump.dump
```

### Restore to Aurora
```bash
pg_restore -h <aurora-endpoint> -U postgres -d gobadi -c gobadi_dump.dump
```

### Or use SQL dump
```bash
# Dump
pg_dump -h <neon-host> -U neondb_owner -d neondb > gobadi_dump.sql

# Restore
psql -h <aurora-endpoint> -U postgres -d gobadi < gobadi_dump.sql
```

### Verify data
```bash
psql -h <aurora-endpoint> -U postgres -d gobadi -c "\dt"    # list tables
psql -h <aurora-endpoint> -U postgres -d gobadi -c "SELECT count(*) FROM users;"
```

---

## Step 3: Update Backend Config

### `.env`
```bash
# BEFORE (Neon)
DB_HOST=ep-wandering-moon-avi86639-pooler.c-11.us-east-1.aws.neon.tech
DB_PORT=5432
DB_USERNAME=neondb_owner
DB_PASSWORD=npg_xxx
DB_DATABASE=neondb
DB_SSL=true

# AFTER (Aurora RDS)
DB_HOST=gobadi-aurora.cluster-xxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-strong-aurora-password
DB_DATABASE=gobadi
DB_SSL=true
```

### No files to modify
- `src/app.module.ts` — already reads env vars
- `src/data-source.ts` — same env vars
- All 53 entity files — pure TypeORM decorators
- `package.json` — no package changes needed
- `src/scripts/seed-admin.ts` — uses same env vars

---

## Step 4: Fix Production Safety (Critical)

### Problem
`src/app.module.ts:70` has `synchronize: true` — this auto-alters schema on every startup. Dangerous in production.

### Fix
```typescript
// src/app.module.ts line 70
synchronize: false,  // NEVER true in production
```

### Generate migrations
```bash
# Generate migration from current schema
npm run migration:generate -- src/migrations/InitialSchema

# Run migrations
npm run migration:run
```

### Update package.json scripts
Already configured:
```json
"typeorm": "typeorm-ts-node-commonjs -d src/data-source.ts",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert"
```

---

## Step 5: Update Render Deployment (if applicable)

### `render.yaml` lines 60-64
Current:
```yaml
databases:
  - name: gobadi-db
    plan: free
    databaseName: gobadi
    user: gobadi
```

Options:
- **Keep Render managed DB** — no change needed
- **Switch to external Aurora** — remove `databases` block, use env vars from Aurora

---

## Step 6: Test

```bash
# Start locally with Aurora
npm run start:dev

# Check health endpoint
curl http://localhost:3000/health

# Verify all modules load (no connection errors in logs)
```

---

## Aurora RDS Cost Estimate

| Tier | Instance | vCPU | RAM | Monthly Cost |
|------|----------|------|-----|-------------|
| Serverless v2 | 0.5-2 ACU | burst | 1-16 GB | ~$15-50 |
| db.t4g.medium | Fixed | 2 | 4 GB | ~$30 |
| db.r6g.large | Fixed | 2 | 16 GB | ~$125 |

Serverless v2 recommended for dev/staging. Production: db.r6g.large+.

---

## Checklist

- [ ] Create Aurora cluster in AWS
- [ ] Configure security group (port 5432)
- [ ] Dump data from Neon
- [ ] Restore data to Aurora
- [ ] Update `.env` with Aurora endpoint
- [ ] Set `synchronize: false` in `app.module.ts`
- [ ] Generate and run migrations
- [ ] Test locally against Aurora
- [ ] Update Render deployment config (if needed)
- [ ] Deploy and verify production
- [ ] Monitor Aurora metrics (connections, CPU, storage)
