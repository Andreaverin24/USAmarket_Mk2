# Product moderation

Phase 3 preserves the Phase 2 Product ID and status contract while adding immutable moderation
history.

## Workflow

1. Approved dealer submits `DRAFT` or `NEEDS_CHANGES` product.
2. Submission creates `ProductModerationReview` for the exact product version.
3. Platform moderator may request changes with a required reason.
4. Dealer edits the canonical product through optimistic locking and resubmits.
5. Moderator approves and publishes.

Publication additionally requires the existing Phase 2 safeguards:

- at least four processed images;
- available inventory;
- approved dealer profile.

## History and comments

Each submission creates a new review. Requested changes and decisions update only that review and
append comments. Seller-visible comments are returned to the owning organization; internal comments
remain platform-only.

Seller cannot call moderation commands. Platform moderator cannot bypass the state machine through a
generic status field.
