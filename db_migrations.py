"""Lightweight SQLite schema migrations.

Each migration is a callable that takes a `sqlite3.Cursor` and applies its
changes idempotently. Migrations are numbered and tracked in `_schema_version`.
Existing databases without the version table get baselined at version 0 and
then run all migrations — every migration must be safe on a populated DB.
"""

import sqlite3
from pathlib import Path
from typing import Callable, List, Tuple


def _ensure_column(cursor: sqlite3.Cursor, table: str, column: str, definition: str) -> None:
    cursor.execute(f"PRAGMA table_info({table})")
    columns = {row[1] for row in cursor.fetchall()}
    if column not in columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _migration_001_initial(cursor: sqlite3.Cursor) -> None:
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            print_date TEXT NOT NULL,
            file_name TEXT NOT NULL,
            print_type TEXT NOT NULL,
            image_file TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS filament_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            print_id INTEGER NOT NULL,
            spool_id INTEGER,
            filament_type TEXT NOT NULL,
            color TEXT NOT NULL,
            grams_used REAL NOT NULL,
            ams_slot INTEGER NOT NULL,
            estimated_grams REAL,
            length_used REAL,
            estimated_length REAL,
            FOREIGN KEY (print_id) REFERENCES prints (id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS print_layer_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            print_id INTEGER NOT NULL UNIQUE,
            total_layers INTEGER,
            layers_printed INTEGER,
            filament_grams_billed REAL,
            filament_grams_total REAL,
            status TEXT NOT NULL DEFAULT 'RUNNING',
            predicted_end_time TEXT,
            actual_end_time TEXT,
            FOREIGN KEY (print_id) REFERENCES prints (id) ON DELETE CASCADE
        )
    ''')

    # Backfill columns added before migrations existed — these older DBs
    # already have the tables but may be missing newer columns.
    _ensure_column(cursor, "filament_usage", "estimated_grams", "REAL")
    _ensure_column(cursor, "filament_usage", "length_used", "REAL")
    _ensure_column(cursor, "filament_usage", "estimated_length", "REAL")
    _ensure_column(cursor, "print_layer_tracking", "predicted_end_time", "TEXT")
    _ensure_column(cursor, "print_layer_tracking", "actual_end_time", "TEXT")


MIGRATIONS: List[Tuple[int, Callable[[sqlite3.Cursor], None]]] = [
    (1, _migration_001_initial),
]


def _current_version(cursor: sqlite3.Cursor) -> int:
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)"
    )
    cursor.execute("SELECT version FROM _schema_version LIMIT 1")
    row = cursor.fetchone()
    if row is None:
        cursor.execute("INSERT INTO _schema_version (version) VALUES (0)")
        return 0
    return int(row[0])


def _set_version(cursor: sqlite3.Cursor, version: int) -> None:
    cursor.execute("UPDATE _schema_version SET version = ?", (version,))


def apply_pending_migrations(db_path: str | Path) -> int:
    """Apply all pending migrations. Returns the new schema version."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path)
    try:
        cursor = conn.cursor()
        version = _current_version(cursor)
        for target, migrate in MIGRATIONS:
            if target > version:
                migrate(cursor)
                _set_version(cursor, target)
                version = target
        conn.commit()
        return version
    finally:
        conn.close()
