# ER Diagram

## Overview

```
+----------------+        +--------------------+
|     users      |        |  refresh_tokens    |
+----------------+        +--------------------+
| id (UUID PK)   |<-1:M--+  id (UUID PK)       |
| first_name     |        |  user_id (FK)      |
| paternal_surn. |        |  token_hash        |
| maternal_surn. |        |  expires_at        |
| birth_date     |        |  revoked_at        |
| age            |        |  replaced_by       |
| role (ENUM)    |        |  created_at        |
| nickname       |        |  created_by        |
| phone_number   |        |  updated_at        |
| email (UQ)     |        |  updated_by        |
| curp (UQ)      |        +--------------------+
| password_hash  |
| is_active      |
| created_at     |
| created_by     |
| updated_at     |
| updated_by     |
| deleted_at     |
+----------------+
        |
        +-- self-FK created_by / updated_by (nullable)
```

## Notes

- `users.age` is recomputed in the application service layer from `users.birth_date`. The DB column is kept as a regular `INTEGER` for query convenience; it must always equal `EXTRACT(YEAR FROM AGE(birth_date))` at write time.
- `refresh_tokens.replaced_by` points to the token that replaced it during rotation. This is what enables replay-detection.
- Both tables carry the 4 mandatory audit columns (`created_at`, `created_by`, `updated_at`, `updated_by`) per the README standards.