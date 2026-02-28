from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str

    @property
    def dsn(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
            f"user={self.db_user} password={self.db_password}"
        )


settings = Settings(
    db_host=os.getenv("DB_HOST", "localhost"),
    db_port=int(os.getenv("DB_PORT", "5432")),
    db_user=os.getenv("DB_USER", "caporal"),
    db_password=os.getenv("DB_PASSWORD", "caporal"),
    db_name=os.getenv("DB_NAME", "caporal"),
)
