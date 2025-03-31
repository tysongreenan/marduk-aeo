import os
from celery import Celery
from dotenv import load_dotenv
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='logs/celery.log',
    filemode='a'
)
logger = logging.getLogger('celery')

# Load environment variables
load_dotenv()

# Get Redis URL from environment variables, fallback to localhost if not set
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Create Celery app
celery_app = Celery(
    'marduk_tasks',
    broker=redis_url,
    backend=redis_url,
    include=['monitoring.tasks']  # Include tasks module
)

# Configure Celery
celery_app.conf.update(
    result_expires=3600,  # Results expire after 1 hour
    worker_prefetch_multiplier=1,  # One task per worker at a time
    task_acks_late=True,  # Acknowledge tasks after execution
    task_time_limit=600,  # Time limit for tasks (10 minutes)
    task_soft_time_limit=300,  # Soft time limit (5 minutes)
    worker_max_tasks_per_child=200,  # Restart workers after 200 tasks
    task_default_queue='default',  # Default queue name
    broker_connection_retry=True,  # Retry connection to broker if lost
    broker_connection_retry_on_startup=True,  # Retry on startup
    broker_connection_max_retries=10,  # Maximum number of retries
    task_serializer='json',  # Use JSON serialization
    accept_content=['json'],  # Accept JSON content
    result_serializer='json',  # Use JSON for results
)

# Create Redis-based beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    'run-daily-reports': {
        'task': 'monitoring.tasks.generate_daily_reports',
        'schedule': 86400.0,  # Run once every 24 hours
        'args': (),
    },
    'cleanup-old-results': {
        'task': 'monitoring.tasks.cleanup_old_results',
        'schedule': 86400.0 * 7,  # Run once a week
        'args': (),
    },
}

# This module is not meant to be run directly
# Use the celery command line interface:
# celery -A celery_worker.celery_app worker --loglevel=info
# celery -A celery_worker.celery_app beat --loglevel=info

if __name__ == '__main__':
    print("To run the Celery worker use the following command:")
    print("celery -A celery_worker.celery_app worker --loglevel=info")
    print("\nTo run the Celery beat scheduler use:")
    print("celery -A celery_worker.celery_app beat --loglevel=info")
    sys.exit(0) 