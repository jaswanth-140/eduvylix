from functools import lru_cache

from pymongo import MongoClient

from .config import Config


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    return MongoClient(Config.MONGO_URI)


def get_db():
    return get_client()[Config.MONGO_DB_NAME]
