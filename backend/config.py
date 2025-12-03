import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DOCS_DIR = os.path.join(BASE_DIR, "docs")
VECTOR_STORE_DIR = os.path.join(BASE_DIR, "vector_store")
COLLECTION_NAME = "personal_kb"

OPENAI_API_KEY = 'sk-SnAyrib3JgD6sCXgTIzLDlrlssCUfeMVb0ExDfvRiuhtNotT'
OPENAI_BASE_URL ='https://api.chatanywhere.tech'

DB_PATH = os.path.join(BASE_DIR, "kb.db")
