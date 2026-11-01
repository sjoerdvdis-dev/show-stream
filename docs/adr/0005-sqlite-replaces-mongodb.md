# SQLite replaces MongoDB

ShowStream stores its data in SQLite. It is a single-host, self-hosted app, like Jellyfin, so a separate database server only adds a container and credentials to manage. Watch progress, users and episodes are relational.

## Consequences

One writer at a time, one host only, and the database file must be on local disk, never NFS or SMB. The media library may still be on a NAS. A live WAL database needs `VACUUM INTO` for backups, not a file copy.

## Considered Options

PostgreSQL was requested first and then replaced by this decision. It suits multi-host deployments, which ShowStream does not need.
