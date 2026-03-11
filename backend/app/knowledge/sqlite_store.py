"""
SQLite operations for the Copilot Architecture Advisor.
"""

import json
import os
import sqlite3
import uuid


DB_PATH = os.environ.get("SQLITE_PATH", "data/advisor.db")


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection, creating the database and tables if needed."""
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else "data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    _init_tables(conn)
    return conn


def _init_tables(conn: sqlite3.Connection) -> None:
    """Create tables if they don't exist."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS use_cases (
            id           TEXT PRIMARY KEY,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed    INTEGER DEFAULT 0,
            answers      TEXT NOT NULL,
            primary_arch TEXT,
            confidence   REAL,
            ranked_json  TEXT,
            enhanced_by_foundry INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS guidance_documents (
            id               TEXT PRIMARY KEY,
            url              TEXT NOT NULL,
            title            TEXT,
            source           TEXT,
            arch_tags        TEXT,
            chunk_index      INTEGER DEFAULT 0,
            chunk_text       TEXT NOT NULL,
            chunk_hash       TEXT,
            chroma_id        TEXT,
            embedded_at      DATETIME,
            confidence_weight REAL DEFAULT 1.0
        );

        CREATE TABLE IF NOT EXISTS guidance_sync_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            synced_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            docs_added   INTEGER DEFAULT 0,
            docs_updated INTEGER DEFAULT 0,
            docs_skipped INTEGER DEFAULT 0,
            status       TEXT,
            error_msg    TEXT
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            use_case_id     TEXT REFERENCES use_cases(id),
            submitted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            actual_arch     TEXT,
            was_correct     INTEGER,
            notes           TEXT
        );
    """)
    conn.commit()


def save_use_case(
    answers: dict,
    primary_arch: str,
    confidence: float,
    ranked: list[dict],
) -> str:
    """Save a use case session and return the session ID."""
    session_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO use_cases (id, completed, answers, primary_arch, confidence, ranked_json)
               VALUES (?, 1, ?, ?, ?, ?)""",
            (
                session_id,
                json.dumps(answers),
                primary_arch,
                confidence,
                json.dumps(ranked),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return session_id


def get_cases(page: int = 1, per_page: int = 20) -> list[dict]:
    """Get recent use case sessions, paginated."""
    conn = get_connection()
    try:
        offset = (page - 1) * per_page
        rows = conn.execute(
            "SELECT * FROM use_cases ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (per_page, offset),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
