--Projects Table
CREATE TABLE IF NOT EXISTS projects (

    -- Universally unique identifier for each project.
    id UUID PRIMARY KEY,

    -- Display name of the project.
    name VARCHAR(100) NOT NULL,

    -- Optional description.
    description TEXT,

    -- Timestamp when the project was created.
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Timestamp of the latest update.
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

