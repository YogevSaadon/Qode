"""
CRUD operations for Queue model.
Pure database operations - no business logic.
"""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Queue


async def create_queue(
    db: AsyncSession,
    name: str,
    host_token: str
) -> Queue:
    """
    Create a new queue in the database.

    Args:
        db: Database session
        name: Queue name
        host_token: Secure random token for host authentication

    Returns:
        Created Queue instance
    """
    queue = Queue(
        name=name,
        host_token=host_token,
        active=True,
        is_paused=False,
        current_position=0,
        last_number_issued=0,
        avg_wait_time=0  # 0 = Calculating...
    )

    db.add(queue)
    await db.commit()
    await db.refresh(queue)

    return queue


async def get_queue_by_id(db: AsyncSession, queue_id: str) -> Optional[Queue]:
    """
    Retrieve a queue by its ID.

    Args:
        db: Database session
        queue_id: Queue UUID

    Returns:
        Queue instance or None if not found
    """
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id)
    )
    return result.scalar_one_or_none()


async def get_queue_by_host_token(db: AsyncSession, host_token: str) -> Optional[Queue]:
    """
    Retrieve a queue by its host token.
    Used for authentication.

    Args:
        db: Database session
        host_token: Host authentication token

    Returns:
        Queue instance or None if not found
    """
    result = await db.execute(
        select(Queue).where(Queue.host_token == host_token)
    )
    return result.scalar_one_or_none()


async def update_queue(db: AsyncSession, queue: Queue) -> Queue:
    """
    Update an existing queue.

    Args:
        db: Database session
        queue: Queue instance with modified fields

    Returns:
        Updated Queue instance
    """
    await db.commit()
    await db.refresh(queue)
    return queue
