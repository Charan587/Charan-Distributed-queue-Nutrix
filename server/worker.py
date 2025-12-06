import time
import random
import uuid
import sys
from datetime import datetime
from sqlmodel import Session, select, col
from database import engine, create_db_and_tables
from models import Job, JobStatus

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

WORKER_ID = str(uuid.uuid4())
MAX_RETRIES = 3
POLL_INTERVAL = 2 # seconds

def get_session():
    return Session(engine)

def process_job(job: Job):
    logger.info(f"[{WORKER_ID}] Processing job {job.id} (Type: {job.type})")
    # Simulate work
    time.sleep(random.uniform(1, 3))
    
    # Simulate random failure (30% chance)
    if random.random() < 0.30:
        raise Exception("Random simulated failure")
    
    logger.info(f"[{WORKER_ID}] Job {job.id} completed")
    return {"message": "Success", "processed_at": datetime.utcnow().isoformat()}

def worker_loop():
    logger.info(f"[{WORKER_ID}] Worker started. Polling for jobs...")
    create_db_and_tables() # Ensure tables exist
    
    while True:
        try:
            with get_session() as session:
                # 1. LEASE: Find a pending job and lock it
                # SQLite doesn't support SELECT ... FOR UPDATE SKIP LOCKED easily.
                # We will use a simple atomic update approach or just optimistic locking.
                # For this prototype, we'll just grab one and update it.
                
                # Find a pending job
                statement = select(Job).where(Job.status == JobStatus.PENDING).limit(1)
                job = session.exec(statement).first()
                
                if job:
                    # Attempt to lock it
                    job.status = JobStatus.PROCESSING
                    job.worker_id = WORKER_ID
                    job.locked_at = datetime.utcnow()
                    job.updated_at = datetime.utcnow()
                    session.add(job)
                    session.commit()
                    session.refresh(job)
                    
                    # Double check we actually got it (in case of race condition)
                    # In a real system with high concurrency, we'd need stricter locking.
                    if job.worker_id != WORKER_ID:
                        logger.warning(f"[{WORKER_ID}] Lost race for job {job.id}")
                        continue
                        
                    try:
                        # 2. PROCESS
                        result = process_job(job)
                        
                        # 3. ACK
                        job.status = JobStatus.COMPLETED
                        job.result = result
                        job.updated_at = datetime.utcnow()
                        session.add(job)
                        session.commit()
                        
                    except Exception as e:
                        # 4. RETRY / DLQ
                        logger.error(f"[{WORKER_ID}] Job {job.id} failed: {e}")
                        job.retry_count += 1
                        job.updated_at = datetime.utcnow()
                        
                        if job.retry_count >= MAX_RETRIES:
                            logger.error(f"[{WORKER_ID}] Job {job.id} moved to DEAD_LETTER")
                            job.status = JobStatus.DEAD_LETTER
                            job.result = {"error": str(e), "final_failure": True}
                        else:
                            logger.info(f"[{WORKER_ID}] Re-queueing job {job.id} (Attempt {job.retry_count})")
                            job.status = JobStatus.PENDING # Re-queue
                            job.worker_id = None # Release lock
                            job.result = {"error": str(e), "attempt": job.retry_count}
                            
                        session.add(job)
                        session.commit()
                else:
                    # No jobs, sleep
                    time.sleep(POLL_INTERVAL)
                    
        except Exception as e:
            logger.error(f"[{WORKER_ID}] Worker loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    worker_loop()
