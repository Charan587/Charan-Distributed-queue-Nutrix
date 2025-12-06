from fastapi import FastAPI, Depends, HTTPException, Request
from sqlmodel import Session, select
from typing import List
from database import create_db_and_tables, get_session
from models import Job, JobCreate, JobRead, JobStatus
from datetime import datetime, timedelta
from collections import defaultdict
import time

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Starting up API server...")
    create_db_and_tables()
    logger.info("Database tables created.")

# Simple in-memory rate limiter
# Map: tenant_id -> list of timestamps
rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60 # seconds
RATE_LIMIT_MAX_REQUESTS = 10

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/jobs":
        # Extract tenant_id from body is hard in middleware without consuming stream.
        # For simplicity, we'll assume a header 'X-Tenant-ID' or just limit by IP for now if header missing.
        tenant_id = request.headers.get("X-Tenant-ID", "anonymous")
        
        now = time.time()
        request_times = rate_limit_store[tenant_id]
        
        # Clean up old requests
        rate_limit_store[tenant_id] = [t for t in request_times if now - t < RATE_LIMIT_WINDOW]
        
        if len(rate_limit_store[tenant_id]) >= RATE_LIMIT_MAX_REQUESTS:
            logger.warning(f"Rate limit exceeded for tenant: {tenant_id}")
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
            
        rate_limit_store[tenant_id].append(now)
        
    response = await call_next(request)
    return response

from fastapi.responses import JSONResponse

@app.post("/jobs", response_model=JobRead)
def create_job(job: JobCreate, session: Session = Depends(get_session)):
    logger.info(f"Received job submission from tenant: {job.tenant_id}, type: {job.type}")
    
    # Check idempotency
    if job.idempotency_key:
        statement = select(Job).where(
            Job.tenant_id == job.tenant_id,
            Job.idempotency_key == job.idempotency_key
        )
        existing_job = session.exec(statement).first()
        if existing_job:
            logger.info(f"Idempotency hit for key: {job.idempotency_key}, returning existing job {existing_job.id}")
            return existing_job

    # Check concurrent job limit (Max 5)
    active_jobs_count = session.query(Job).filter(
        Job.tenant_id == job.tenant_id,
        Job.status.in_([JobStatus.PENDING, JobStatus.PROCESSING])
    ).count()

    if active_jobs_count >= 5:
        logger.warning(f"Concurrent job limit (5) reached for tenant {job.tenant_id}. Sending to DLQ.")
        # Instead of 429, send to DLQ
        db_job = Job.from_orm(job)
        db_job.status = JobStatus.DEAD_LETTER
        db_job.result = {"error": "Rate limit exceeded (Max 5 concurrent jobs)"}
        session.add(db_job)
        session.commit()
        session.refresh(db_job)
        return db_job

    db_job = Job.from_orm(job)
    session.add(db_job)
    session.commit()
    session.refresh(db_job)
    logger.info(f"Job created successfully: {db_job.id}")
    return db_job

@app.get("/jobs", response_model=List[JobRead])
def read_jobs(offset: int = 0, limit: int = 100, session: Session = Depends(get_session)):
    jobs = session.exec(select(Job).offset(offset).limit(limit).order_by(Job.created_at.desc())).all()
    return jobs

@app.get("/jobs/{job_id}", response_model=JobRead)
def read_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/stats")
def read_stats(session: Session = Depends(get_session)):
    total = session.query(Job).count()
    pending = session.query(Job).filter(Job.status == JobStatus.PENDING).count()
    processing = session.query(Job).filter(Job.status == JobStatus.PROCESSING).count()
    completed = session.query(Job).filter(Job.status == JobStatus.COMPLETED).count()
    failed = session.query(Job).filter(Job.status == JobStatus.FAILED).count()
    dead_letter = session.query(Job).filter(Job.status == JobStatus.DEAD_LETTER).count()
    
    return {
        "total": total,
        "pending": pending,
        "processing": processing,
        "completed": completed,
        "failed": failed,
        "dead_letter": dead_letter
    }
