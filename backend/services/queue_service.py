"""
Queue service - Business logic for queue operations.
Handles token generation, validation, and queue initialization.
"""
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from crud import queues as queue_crud
from models import Queue


async def create_new_queue(db: AsyncSession, name: str) -> Queue:
    """
    Create a new queue with secure token generation.

    Business logic:
    1. Generate secure host token using secrets.token_urlsafe(32)
    2. Validate name (basic sanitization)
    3. Create queue with proper defaults

    Args:
        db: Database session
        name: Queue name (validated)

    Returns:
        Created Queue instance with host_token

    Raises:
        ValueError: If name is invalid
    """
    # Validate and sanitize name
    name = name.strip()
    if not name or len(name) > 100:
        raise ValueError("Queue name must be between 1 and 100 characters")

    # Generate secure host token (NOT a UUID - use secrets module)
    host_token = secrets.token_urlsafe(32)

    # Create queue via CRUD layer
    queue = await queue_crud.create_queue(
        db=db,
        name=name,
        host_token=host_token
    )

    return queue


async def get_queue_by_id(db: AsyncSession, queue_id: str) -> Queue:
    """
    Retrieve a queue by ID.

    Args:
        db: Database session
        queue_id: Queue UUID

    Returns:
        Queue instance

    Raises:
        ValueError: If queue not found
    """
    queue = await queue_crud.get_queue_by_id(db, queue_id)
    if not queue:
        raise ValueError(f"Queue {queue_id} not found")
    return queue


async def verify_host_token(db: AsyncSession, queue_id: str, host_token: str) -> bool:
    """
    Verify that the provided host_token matches the queue's token.

    Args:
        db: Database session
        queue_id: Queue UUID
        host_token: Token to verify

    Returns:
        True if valid, False otherwise
    """
    queue = await queue_crud.get_queue_by_id(db, queue_id)
    if not queue:
        return False

    # Use constant-time comparison to prevent timing attacks
    return secrets.compare_digest(queue.host_token, host_token)
