"""
ChromaDB operations for the Copilot Architecture Advisor.
Uses local SentenceTransformer embeddings (all-MiniLM-L6-v2) — no Azure OpenAI call.
"""

import logging
import os
from typing import Optional

import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIR = os.environ.get("CHROMA_PERSIST_DIR", "data/chroma_db")
CHROMA_HOST = os.environ.get("CHROMA_HOST", "")
CHROMA_PORT = int(os.environ.get("CHROMA_PORT", "8001"))
COLLECTION_NAME = os.environ.get("CHROMA_COLLECTION", "copilot_guidance")

# Singleton client and collection
_client: Optional[chromadb.ClientAPI] = None
_collection: Optional[chromadb.Collection] = None


def _get_embed_fn() -> embedding_functions.SentenceTransformerEmbeddingFunction:
    """Get local SentenceTransformer embedding function."""
    return embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )


def get_chroma_client() -> chromadb.ClientAPI:
    """Get or create ChromaDB client (persistent local or remote)."""
    global _client
    if _client is not None:
        return _client

    if CHROMA_HOST:
        # Connect to remote ChromaDB server
        _client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        logger.info(f"Connected to remote ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}")
    else:
        # Use persistent local storage
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        logger.info(f"Using persistent ChromaDB at {CHROMA_PERSIST_DIR}")

    return _client


def get_collection() -> chromadb.Collection:
    """Get or create the copilot_guidance collection."""
    global _collection
    if _collection is not None:
        return _collection

    client = get_chroma_client()
    embed_fn = _get_embed_fn()

    _collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(f"ChromaDB collection '{COLLECTION_NAME}' ready with {_collection.count()} documents")
    return _collection


def add_documents(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict],
) -> int:
    """Add or update documents in the collection. Returns count added."""
    if not ids:
        return 0

    collection = get_collection()
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )
    return len(ids)


def query_guidance(
    query_text: str,
    n_results: int = 5,
    arch_filter: Optional[str] = None,
) -> dict:
    """
    Query the guidance collection.
    Returns dict with 'documents', 'metadatas', 'distances'.
    """
    collection = get_collection()

    if collection.count() == 0:
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    where = None
    if arch_filter and arch_filter != "ALL":
        where = {"arch_tags": {"$contains": arch_filter}}

    try:
        results = collection.query(
            query_texts=[query_text],
            n_results=min(n_results, collection.count()),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        return results
    except Exception as e:
        logger.error(f"ChromaDB query failed: {e}")
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}


def get_doc_count() -> int:
    """Return total document count in collection."""
    try:
        collection = get_collection()
        return collection.count()
    except Exception:
        return 0
