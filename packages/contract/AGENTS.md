# Contract

The single definition of the API. The API serves it and `packages/api-client` calls it.

| File | Holds |
|---|---|
| `src/endpoints.ts` | One definition per endpoint: method, path, params, body, response |
| `src/api-types.ts` | Response and notification schemas, and the types inferred from them |
| `src/errors.ts` | The one error shape and its stable codes |

- Schemas are the source of truth. Infer types from them and never write a type by hand that a schema could give.
- To add a route, add an endpoint here. The compiler then requires its handler in `apps/api`, and the typed client gains the call by itself.
- Failed responses always use `apiErrorSchema`. Add a code only when a client must treat that failure differently.
- `code` values are stable, so never rename one. Clients must not match on `message`.
- Paths are strings until `params` parses them. Validate strictly, because `Number()` accepts `''`, `0x10` and `1e3`.
- TMDB data stays a passthrough: typed with `tmdb-ts`, not validated field by field.
- A contract endpoint needs a session by default. Set `access` to `public` or `admin` only on purpose.
- Runtime code loads `dist`, so a consumer's task must depend on `^build`. Types come straight from `src`.

Every breaking change carries a version note in `CHANGELOG.md`.
