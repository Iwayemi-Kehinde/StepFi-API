# Code Standards — StepFi-Contracts

## Language: Rust + Soroban SDK

These standards apply to all contracts under `contracts/`. Every rule here exists to prevent a class of bugs that are extremely costly in deployed smart contracts — data archival, reentrancy, overflow, and unauthorized access.

---

## File Organization

Every contract must follow this exact internal structure. No exceptions:

```
src/
├── lib.rs       # Public contract interface only — no logic, no storage calls
├── storage.rs   # ALL env.storage() reads and writes
├── events.rs    # ALL env.events().publish() calls
├── types.rs     # Structs, enums, #[contracttype] definitions
├── errors.rs    # Error enum with #[contracttype]
├── access.rs    # Auth helpers — require_admin(), require_updater(), etc.
└── tests.rs     # Unit tests
```

If a file grows too large, split by domain — not by arbitrary line count. For example, `creditline-contract` can have `storage_loans.rs` and `storage_pool.rs` rather than one monolithic `storage.rs`.

---

## lib.rs Rules

`lib.rs` is the public interface only. It must:

- Declare the contract struct and `#[contractimpl]` block
- Call functions from `storage.rs`, `events.rs`, and `access.rs`
- Contain zero `env.storage()` calls
- Contain zero `env.events()` calls
- Contain zero arithmetic logic — delegate to helper functions

```rust
// CORRECT
pub fn repay_loan(env: Env, borrower: Address, loan_id: u64, amount: i128) -> i128 {
    borrower.require_auth();
    access::check_not_locked(&env);
    storage::set_locked(&env, true);
    let result = loan_logic::process_repayment(&env, &borrower, loan_id, amount);
    storage::set_locked(&env, false);
    events::emit_loan_repaid(&env, loan_id, amount, result);
    result
}

// WRONG — storage and events called directly in lib.rs
pub fn repay_loan(env: Env, ...) {
    borrower.require_auth();
    let loan = env.storage().persistent().get(...); // ❌
    env.events().publish(...); // ❌
}
```

---

## storage.rs Rules

- Every public storage function has a doc comment explaining what it reads/writes.
- Every persistent storage write is immediately followed by `extend_ttl()`.
- Read functions return `Option<T>` — never panic on missing keys in reads.
- Write functions panic only on genuine invariant violations (e.g., counter overflow).

```rust
// CORRECT — TTL extended after every persistent write
pub fn write_loan(env: &Env, loan: &Loan) {
    let key = DataKey::Loan(loan_shard(loan.loan_id), loan.loan_id);
    env.storage().persistent().set(&key, loan);
    env.storage().persistent().extend_ttl(
        &key,
        PERSISTENT_TTL_THRESHOLD,
        PERSISTENT_TTL_EXTEND_TO,
    );
}

// WRONG — missing extend_ttl
pub fn write_loan(env: &Env, loan: &Loan) {
    let key = DataKey::Loan(loan_shard(loan.loan_id), loan.loan_id);
    env.storage().persistent().set(&key, loan); // ❌ no TTL extension
}
```

---

## events.rs Rules

- Every event emission is a dedicated function with a descriptive name: `emit_loan_created`, `emit_score_changed`, etc.
- Event symbol strings are UPPER_CASE and max 9 characters.
- Event data is a tuple or struct — never a bare string.
- No event logic in `lib.rs`.

```rust
// CORRECT
pub fn emit_loan_created(env: &Env, loan_id: u64, total: i128, borrower: &Address) {
    env.events().publish(
        (symbol_short!("LOANCRTD"),),
        (loan_id, total, borrower.clone()),
    );
}
```

---

## Auth Rules

- `require_auth()` is the absolute first line of every mutating public function.
- Admin-only functions call `access::require_admin(&env)` immediately after `require_auth()`.
- Updater-only functions call `access::require_updater(&env, &caller)`.
- Restricted functions (e.g., `fund_loan` callable only by creditline) validate the caller address explicitly.

```rust
// CORRECT
pub fn update_parameters(env: Env, admin: Address, params: ProtocolParameters) {
    admin.require_auth();           // auth first
    access::require_admin(&env, &admin);  // then role check
    storage::set_parameters(&env, &params);
    events::emit_params_updated(&env, &params);
}
```

---

## Arithmetic Rules

- Use `checked_add`, `checked_sub`, `checked_mul`, `checked_div` everywhere.
- Use `.expect("descriptive message")` — never `.unwrap()` on arithmetic results.
- Never use raw `+`, `-`, `*` on financial amounts.

```rust
// CORRECT
let new_balance = remaining_balance
    .checked_sub(payment_amount)
    .expect("Repayment amount exceeds remaining balance");

// WRONG
let new_balance = remaining_balance - payment_amount; // ❌ can underflow
```

---

## Error Handling

Define all errors in `errors.rs`:

```rust
#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum CreditLineError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InsufficientLiquidity = 3,
    InsufficientReputation = 4,
    LoanNotFound = 5,
    LoanNotActive = 6,
    InvalidAmount = 7,
    ReentrancyDetected = 8,
    Unauthorized = 9,
    VendorNotActive = 10,
}
```

Use `panic_with_error!` for unrecoverable errors, `Result<T, E>` for recoverable ones. Be consistent within a contract — don't mix styles.

---

## Testing Rules

- All tests live in `tests.rs` with `#[cfg(test)]`.
- Use `soroban_sdk::Env::default()` — never a real network in unit tests.
- Use `env.mock_all_auths()` — never real key signing in unit tests.
- Use `env.ledger().set_timestamp()` for time-dependent tests (overdue, grace period, TTL).
- Every public contract function must have at least one test.
- Mock cross-contract dependencies using the SDK's `register_contract` pattern.
- Test names describe the scenario: `test_repay_loan_full_payment_increases_reputation`, not `test_repay_1`.

```rust
#[test]
fn test_create_loan_requires_minimum_reputation() {
    let env = Env::default();
    env.mock_all_auths();
    // ... setup
    // ... assert error
}
```

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files | `snake_case.rs` | `storage.rs`, `loan_logic.rs` |
| Structs / Enums | `PascalCase` | `Loan`, `LoanStatus`, `ProtocolParameters` |
| Functions | `snake_case` | `create_loan`, `get_score`, `extend_persistent_ttl` |
| Storage key symbols | `UPPER_SNAKE_CASE`, max 9 chars | `ADMIN`, `LOANCNT`, `LIQPOOL` |
| Event symbols | `UPPER_CASE`, max 9 chars | `LOANCRTD`, `SCORECHGD`, `LQDEPST` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_SCORE`, `LATE_FEE_BPS_PER_DAY` |
| Test functions | `test_` prefix + scenario description | `test_deposit_increases_shares` |

---

## What Not To Do

- Do not call `env.storage()` directly in `lib.rs` — use `storage.rs`
- Do not call `env.events()` directly in `lib.rs` — use `events.rs`
- Do not use `.unwrap()` on arithmetic — use `checked_*` with `.expect()`
- Do not skip `require_auth()` on any mutating function
- Do not skip `extend_ttl()` after any persistent storage write
- Do not use raw `+`, `-`, `*` on financial amounts
- Do not hardcode contract addresses — pass them via `initialize()` and store in instance storage
- Do not modify a deployed contract's storage key structure — it will break existing data
- Do not use `temporary` storage for anything that must survive beyond a single transaction
- Do not write tests that depend on real network state — always use `Env::default()`
