# Application Layer

Use cases (commands/queries) orchestrate domain logic.

Constraints:
- Call domain aggregates; do not embed infrastructure concerns.
- No NestJS decorators in domain code; adapters live in infrastructure.
- Repositories load/save aggregates only; they do not enforce business rules.

Structure:
- commands/: command handlers for mutations (delegate to GenealogyGraph aggregate)
- queries/: query handlers for reads (delegate to GenealogyGraph aggregate)
- services/: application service wiring commands/queries to repositories
- validation.ts: application-level helpers (relationship row shape, canonical spouse ordering)

Notes:
- Business rules stay in domain. Application ensures data shaping (e.g., spouse ordering) and orchestration only.
