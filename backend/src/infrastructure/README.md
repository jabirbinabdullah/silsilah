# Infrastructure Layer

Adapters for persistence, HTTP, messaging, etc. Repositories here should only load/save aggregates; they must not enforce domain rules.

Planned:
- Prisma repository implementations (once schema is defined)
- HTTP controllers calling application commands/queries

Do not place domain logic here.

## Mapping Notes (Prisma Schema → Domain)
- `family_trees` + `persons` + `relationships` represent the persisted shape of the `GenealogyGraph` aggregate. They are storage models, **not** domain entities.
- `relationships.relation_type` distinguishes `PARENT_CHILD` vs `SPOUSE`; uniqueness indexes support edge uniqueness. Cycle prevention stays in the domain layer.
- Max-2-parents is primarily enforced in domain logic; DB uniqueness helps but does not replace domain checks.
- `users` holds authentication/authorization roles only; no domain logic.
- Repositories must hydrate and persist entire aggregates transactionally; they must not enforce business rules.
