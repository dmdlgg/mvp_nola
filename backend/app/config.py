import os

from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Keep compatibility if backend is run from project root as a package
if not OPENAI_API_KEY:
    load_dotenv("backend/.env")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    MODEL = os.getenv("OPENAI_MODEL", MODEL)
