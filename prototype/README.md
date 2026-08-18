# DecorFlavor Prototype

An isolated, local-only working prototype for the DecorFlavor premium furniture marketplace. It does not
call an API, collect personal data, process payments, or create delivery obligations.

## Run

From the repository root:

```text
python -m http.server 8090 --directory prototype
```

Open `http://127.0.0.1:8090`.

## Verify foundation

```text
node prototype/tests/foundation.test.mjs
```

The current slice provides fixture data, browser-local state/recovery, role switching, unique-item
reservation, idempotent command handling, reset, and an audit timeline. The next slices add buyer
checkout, seller/operations, then driver/incident flows.
