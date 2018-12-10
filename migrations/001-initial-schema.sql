-- Up
CREATE TABLE users (
    user_id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    notifications INTEGER NOT NULL DEFAULT 1
);

-- Down
DROP TABLE users;