# Prisma Setup

- Database: PostgreSQL (DATABASE_URL expected in env).
- `schema.prisma` defines storage models for family_trees, persons, relationships, users.
- Prisma models are **not** domain entities; domain logic remains in the domain layer.
- Circular ancestry checks and other business rules stay outside SQL/triggers.
- Migrations are not generated yet.
