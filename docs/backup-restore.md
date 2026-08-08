# Database backup and restore

A `postgres-backup` CronJob dumps the database nightly at 02:15 UTC to the
`postgres-backup-pvc` volume, keeping 14 days.

The dump is written under a temporary name and moved into place only after
`pg_dump` exits cleanly, then verified with `gzip -t`, so a truncated dump can
never be mistaken for a good one.

## What this does and does not protect against

Covered: a bad migration, a dropped table, corruption, an accidental delete.

**Not covered:** loss of the cluster or the node's disk. The dumps live on a
volume in the same cluster as the data. Before real customer data, change the
CronJob's destination to object storage outside the cluster, or move to a
managed Postgres with point-in-time recovery.

## Check backups are actually running

```bash
kubectl -n recycling-app get cronjob postgres-backup
kubectl -n recycling-app get jobs -l job-name --sort-by=.metadata.creationTimestamp | tail -5
```

`LAST SCHEDULE` going stale is the signal that backups have quietly stopped —
worth an alert, since nothing else will tell you.

## Run one now

```bash
kubectl -n recycling-app create job backup-now --from=cronjob/postgres-backup
kubectl -n recycling-app logs job/backup-now
```

## List what exists

```bash
kubectl -n recycling-app run backup-ls --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --overrides='{"spec":{"containers":[{"name":"ls","image":"postgres:16-alpine","command":["ls","-1sh","/backup"],"volumeMounts":[{"name":"b","mountPath":"/backup"}]}],"volumes":[{"name":"b","persistentVolumeClaim":{"claimName":"postgres-backup-pvc"}}]}}'
```

## Restore

Restore into a scratch database first and compare row counts. Never restore
straight over the live database — if the dump is bad you have then destroyed
the only copy of the data.

```bash
# 1. Scale the backend down so nothing writes mid-restore
kubectl -n recycling-app scale deploy/backend --replicas=0

# 2. Restore into a scratch database and inspect it
#    (see the Job in this repo's history, or adapt the backup CronJob spec)
#    gunzip -c /backup/recycling-<stamp>.sql.gz | psql -d restore_test

# 3. Once satisfied, swap it in
#    psql -d postgres -c 'ALTER DATABASE recycling RENAME TO recycling_old;'
#    psql -d postgres -c 'ALTER DATABASE restore_test RENAME TO recycling;'

# 4. Bring the backend back
kubectl -n recycling-app scale deploy/backend --replicas=1
```

Keep `recycling_old` until the application has been verified against the
restored data.

## Verified

The restore path was exercised on 2026-08-08: the nightly dump was restored into
a scratch database and matched the live database exactly — 20 districts, 15
electronics items, 34 neighbour pairs — with all 39 indexes recreated.

Re-run that check whenever the schema changes materially. A backup nobody has
restored is an assumption, not a backup.
