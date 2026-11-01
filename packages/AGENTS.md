# Packages

- Dependencies point from apps to packages, so a package imports only other packages.
- When you change a shared package, check every consumer. `pnpm turbo check-types lint build test` covers them.
