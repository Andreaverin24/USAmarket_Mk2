# Dealer onboarding

Dealer onboarding is a manual, auditable Phase 3 workflow.

## States

`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED`

Exceptional paths:

- `UNDER_REVIEW → CHANGES_REQUESTED → SUBMITTED`;
- `UNDER_REVIEW → REJECTED`;
- `APPROVED → SUSPENDED`.

Only explicit application service commands may change status. Direct status updates from UI are
not accepted.

## Data handling

Application stores legal/public names, business type, website, contact channels, structured US
business address, contact person, description, specialties, years in business and supporting
document references. Raw private documents are not stored in audit metadata or application logs.

Every review decision creates immutable `DealerVerification`, `AuditLog` and `OutboxEvent` rows.
Approval creates/updates the public `DealerProfile` and activates the existing storefront.

## Publication gate

An organization membership alone is insufficient to submit a product. Product submission requires:

1. active membership with `catalog:submit`;
2. seller ownership of the product;
3. `DealerProfile.status = APPROVED`;
4. valid current product state.
