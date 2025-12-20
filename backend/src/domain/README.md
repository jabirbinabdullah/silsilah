# Domain Layer

Framework-agnostic business model. Keep entities, value objects, aggregates, and domain services here.

Constraints:
- No NestJS decorators
- No Prisma imports
- No DTOs
- `GenealogyGraph` is the sole aggregate root and mutation authority
