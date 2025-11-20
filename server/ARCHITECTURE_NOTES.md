## Server Architecture Notes

This backend grew around a single `index.js` entrypoint that now exceeds 17k
lines. To keep the existing logic stable **without** breaking the monolithic
flow, add any *new* logic in dedicated modules and import them into
`index.js`. The goal is to keep the entrypoint as a thin wiring layer while
feature code lives in focused files.

### Folder Structure For New Code

```
server/
  lib/                # Pure helpers (validation, formatting, cache utilities)
    pricing.js
    passengers.js
    ...
  services/           # Business logic grouped by domain
    vouchers/
      passengerInference.js
      creation.js
    bookings/
      availability.js
      notifications.js
  controllers/        # Express route handlers (split per resource)
    voucherController.js
    bookingController.js
```

> \* Create the `lib`, `services`, or `controllers` folders (if they do not
> already exist) when adding new logic. Keep naming consistent with the
> domain you are working on.

### Integration Rules

1. **Do not rewrite `index.js` wholesale.** Instead:
   - Export functions from the new module.
   - Require/import them near the top of `index.js`.
   - Call the function inside the existing route or webhook handler.

2. **Shared utilities** (e.g., pricing cache, passenger inference) belong in
   `server/lib/`. Keep them dependency-free so they can be reused by multiple
   services.

3. **Business/domain logic** (voucher creation, booking flows, etc.) belongs
   under `server/services/<domain>/`.

4. **Route/controller code** can optionally move into
   `server/controllers/`—only if the route grows complicated. Keep the
   exported function signature as `(req, res, next)` so it plugs into Express.

5. **Stateful helpers** (caches, schedulers) should expose an initialization
   method that `index.js` calls once during startup. This avoids hidden side
   effects when the module is required.

### Example Pattern

```js
// server/lib/passengers.js
module.exports = {
  derivePassengerCount,
  normalizePassengerData,
};

// server/services/vouchers/passengerInference.js
const { derivePassengerCount } = require('../../lib/passengers');

function resolveVoucherPassengers(payload) {
  return derivePassengerCount(payload);
}

module.exports = { resolveVoucherPassengers };

// index.js
const { resolveVoucherPassengers } = require('./services/vouchers/passengerInference');

app.post('/api/createVoucher', (req, res) => {
  const passengerCount = resolveVoucherPassengers(req.body);
  // existing logic...
});
```

### When Adding New Logic

- Ask: *Does this code touch routes?* → consider `controllers/`.
- Ask: *Is it core business logic?* → place under `services/<domain>/`.
- Ask: *Is it a generic helper/cache?* → place under `lib/`.
- Document the module’s intent at the top of the file; this keeps onboarding
  lightweight without bloating `index.js`.

Following this guideline keeps future work modular while preserving the
existing entrypoint logic. When touching legacy sections inside `index.js`,
limit the change to `require(...)` statements and function calls that point
to the new modules documented here.

