"""
CRUD operations for Ticket model.
Pure database operations - no business logic.
"""
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Ticket, TicketStatus


async def create_ticket(
    db: AsyncSession,
    queue_id: str,
    device_token: str,
    position_number: int
) -> Ticket:
    """
    Create a new ticket in the database.

    Args:
        db: Database session
        queue_id: Queue UUID
        device_token: Guest device identifier
        position_number: Position in line (already atomically generated)

    Returns:
        Created Ticket instance
    """
    ticket = Ticket(
        queue_id=queue_id,
        device_token=device_token,
        position_number=position_number,
        status=TicketStatus.WAITING
    )

    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return ticket


async def get_ticket_by_id(db: AsyncSession, ticket_id: str) -> Optional[Ticket]:
    """
    Retrieve a ticket by its ID.

    Args:
        db: Database session
        ticket_id: Ticket UUID

    Returns:
        Ticket instance or None if not found
    """
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    return result.scalar_one_or_none()


async def get_active_ticket_for_device(
    db: AsyncSession,
    queue_id: str,
    device_token: str
) -> Optional[Ticket]:
    """
    Check if a device already has an active ticket in this queue.
    Active means: WAITING, CALLED, or SERVING status.

    Args:
        db: Database session
        queue_id: Queue UUID
        device_token: Device identifier

    Returns:
        Existing active Ticket or None
    """
    result = await db.execute(
        select(Ticket)
        .where(
            Ticket.queue_id == queue_id,
            Ticket.device_token == device_token,
            Ticket.status.in_([
                TicketStatus.WAITING,
                TicketStatus.CALLED,
                TicketStatus.SERVING
            ])
        )
        .order_by(Ticket.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_queue_tickets(
    db: AsyncSession,
    queue_id: str,
    status: Optional[TicketStatus] = None
) -> List[Ticket]:
    """
    Get all tickets for a queue, optionally filtered by status.

    Args:
        db: Database session
        queue_id: Queue UUID
        status: Optional status filter

    Returns:
        List of Ticket instances
    """
    query = select(Ticket).where(Ticket.queue_id == queue_id)

    if status:
        query = query.where(Ticket.status == status)

    query = query.order_by(Ticket.position_number)

    result = await db.execute(query)
    return list(result.scalars().all())
