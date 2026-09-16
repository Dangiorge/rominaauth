// path: db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role_id INTEGER REFERENCES roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE registered_paths (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  icon VARCHAR(100),
  category VARCHAR(100),
  parent_id INTEGER REFERENCES registered_paths(id),
  is_sidebar_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  path_id INTEGER REFERENCES registered_paths(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  custom_flags JSONB DEFAULT '{}',
  UNIQUE(role_id, path_id)
);