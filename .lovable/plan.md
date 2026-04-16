

# Hashbin.net — Updated Plan

Same as before, with two changes to what gets stored:

## Changes

1. **File size**: Always sent to the server and stored in the `timestamps` table as `file_size` (bigint, not null).

2. **File name (optional)**: A checkbox/toggle on the stamp page: "Include file name in record" (off by default). If enabled, the original file name is sent and stored as `file_name` (text, nullable). The verify page will display the file name if present.

## Updated Database Schema

```text
timestamps
├── id           uuid, primary key
├── hash         text, indexed, not null
├── file_size    bigint, not null
├── file_name    text, nullable
├── created_at   timestamptz, not null
├── server_signature text, not null
└── user_id      uuid, nullable (FK → auth.users)
```

## UI Impact

- **Stamp page**: After file is hashed, show file size (formatted) and a toggle "Include file name in timestamp record" (default off). Both values sent on submission.
- **Verify page**: Display file size always; display file name if stored.
- **My Timestamps page**: Show file size and file name (if present) in the list.

Everything else from the previous plan (client-side SHA-256 hashing, public hash lookup, optional auth, minimal/trustworthy design, edge function signing) remains unchanged.

