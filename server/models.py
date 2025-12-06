from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, JSON, Column
from enum import Enum

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"

class JobBase(SQLModel):
    type: str
    payload: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    tenant_id: str
    idempotency_key: Optional[str] = Field(default=None, index=True)

class Job(JobBase, table=True):
    __tablename__ = "jobs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    status: JobStatus = Field(default=JobStatus.PENDING, index=True)
    worker_id: Optional[str] = None
    retry_count: int = Field(default=0)
    result: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    locked_at: Optional[datetime] = None

class JobCreate(JobBase):
    pass

class JobRead(JobBase):
    id: UUID
    status: JobStatus
    retry_count: int
    worker_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    result: Optional[Dict[str, Any]]
