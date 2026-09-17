CREATE TABLE IF NOT EXISTS snippet_operations (
  id TEXT PRIMARY KEY NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  object_key TEXT NOT NULL UNIQUE,
  reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes BETWEEN 0 AND 65536),
  state TEXT NOT NULL CHECK (state IN ('creating', 'active', 'deleting', 'deleted')),
  delete_title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (state = 'deleted' AND reserved_bytes = 0) OR
    (state <> 'deleted' AND reserved_bytes BETWEEN 1 AND 65536)
  ),
  CHECK (
    (state = 'deleting' AND delete_title IS NOT NULL) OR
    (state <> 'deleting' AND delete_title IS NULL)
  )
);

-- migrate:split
CREATE TABLE IF NOT EXISTS snippets (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  body_sha256 TEXT NOT NULL CHECK (length(body_sha256) = 64),
  body_bytes INTEGER NOT NULL CHECK (body_bytes BETWEEN 1 AND 65536),
  created_at TEXT NOT NULL,
  FOREIGN KEY (id) REFERENCES snippet_operations(id)
);

-- migrate:split
CREATE INDEX IF NOT EXISTS snippets_created_at
  ON snippets (created_at DESC, id DESC);

-- migrate:split
CREATE INDEX IF NOT EXISTS operations_visible_created_at
  ON snippet_operations (created_at DESC, id DESC)
  WHERE state IN ('active', 'deleting');

-- migrate:split
CREATE TRIGGER IF NOT EXISTS snippets_activate_operation
AFTER INSERT ON snippets
BEGIN
  UPDATE snippet_operations
     SET state = 'active',
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = NEW.id
     AND state = 'creating'
     AND payload_sha256 = NEW.payload_sha256
     AND object_key = NEW.object_key;
  SELECT CASE WHEN changes() <> 1
    THEN RAISE(ABORT, 'ACTIVATION_PRECONDITION_LOST')
  END;
END;

-- migrate:split
CREATE TRIGGER IF NOT EXISTS operations_enforce_capacity
BEFORE INSERT ON snippet_operations
BEGIN
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM snippet_operations) >= 1000
      THEN RAISE(ABORT, 'ACTIVITY_LIMIT_REACHED')
    WHEN (SELECT COUNT(*) FROM snippet_operations WHERE reserved_bytes > 0) >= 100
      OR COALESCE((SELECT SUM(reserved_bytes) FROM snippet_operations), 0)
           + NEW.reserved_bytes > 1048576
      THEN RAISE(ABORT, 'SHELF_LIMIT_REACHED')
  END;
END;
