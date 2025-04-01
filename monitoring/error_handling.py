"""
Error handling utilities for the monitoring application.
Provides graceful fallbacks and recovery mechanisms for common errors.
"""

import os
import logging
from typing import Dict, Any, Optional, Callable, TypeVar, Union
import functools
import time
from contextlib import contextmanager

# Setup logging
logger = logging.getLogger("monitoring.error_handling")

T = TypeVar('T')

class ServiceError(Exception):
    """Base exception for service errors"""
    def __init__(self, message: str, service: str, detail: Optional[Dict[str, Any]] = None):
        self.service = service
        self.detail = detail or {}
        super().__init__(f"{service} error: {message}")


class DatabaseError(ServiceError):
    """Exception for database connection or query errors"""
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, "database", detail)


class RedisError(ServiceError):
    """Exception for Redis connection or operation errors"""
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, "redis", detail)


class LLMError(ServiceError):
    """Exception for LLM API errors"""
    def __init__(self, message: str, provider: str, detail: Optional[Dict[str, Any]] = None):
        detail = detail or {}
        detail["provider"] = provider
        super().__init__(message, "llm", detail)


def retry(
    max_attempts: int = 3,
    delay_seconds: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
) -> Callable:
    """
    Decorator to retry a function call on failure with exponential backoff.
    
    Args:
        max_attempts: Maximum number of attempts before giving up
        delay_seconds: Initial delay between retries in seconds
        backoff_factor: Factor to increase delay between retries
        exceptions: Tuple of exceptions to catch and retry on
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            delay = delay_seconds
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts:
                        logger.warning(
                            f"Attempt {attempt}/{max_attempts} failed for {func.__name__}: {str(e)}. "
                            f"Retrying in {delay:.2f}s..."
                        )
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}. "
                            f"Last error: {str(e)}"
                        )
            
            if last_exception:
                raise last_exception
            return None  # Should never reach here
        
        return wrapper
    
    return decorator


@contextmanager
def graceful_db_connect(default_return: Any = None, raise_error: bool = False):
    """
    Context manager for graceful database connection handling.
    
    Args:
        default_return: Default value to return if database connection fails
        raise_error: Whether to raise the caught exception
        
    Yields:
        Context for database operations
    """
    try:
        yield
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        if raise_error:
            raise DatabaseError(str(e), {"original_error": str(e)}) from e
        return default_return


def safe_supabase_query(query_func: Callable[[], T], default: T) -> T:
    """
    Safely execute a Supabase query function with error handling.
    
    Args:
        query_func: Function that executes a Supabase query
        default: Default value to return if the query fails
        
    Returns:
        Query result or default value on error
    """
    try:
        return query_func()
    except Exception as e:
        logger.error(f"Supabase query error: {str(e)}")
        return default


def get_fallback_value(key: str, default: Any = None) -> Any:
    """
    Get a value from environment variables with fallback.
    
    Args:
        key: Environment variable name
        default: Default value if environment variable is not set
        
    Returns:
        Environment variable value or default
    """
    return os.getenv(key, default)


def is_service_available(check_func: Callable[[], bool], service_name: str) -> bool:
    """
    Check if a service is available.
    
    Args:
        check_func: Function that checks service availability
        service_name: Name of the service for logging
        
    Returns:
        True if service is available, False otherwise
    """
    try:
        result = check_func()
        if result:
            logger.info(f"{service_name} is available")
        else:
            logger.warning(f"{service_name} check returned False")
        return result
    except Exception as e:
        logger.error(f"{service_name} availability check failed: {str(e)}")
        return False 