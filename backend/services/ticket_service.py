"""
Ticket service - Business logic for ticket operations.
CRITICAL: Handles atomic ticket creation to prevent race conditions.
"""
from datetime import datetime
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from crud import tickets as ticket_crud
from crud import queues as queue_crud
from models import Ticket, Queue, TicketStatus


async def join_queue(db: AsyncSession, queue_id: str, device_token: str) -> Ticket:
    """
    Join a queue and receive a ticket.

    CRITICAL IMPLEMENTATION:
    - Idempotency: Check for existing active ticket first
    - Atomic Increment: Use database-level atomic update for position assignment
    - Transaction: Ensure consistency

    Args:
        db: Database session
        queue_id: Queue UUID
        device_token: Guest device identifier (UUID from localStorage)

    Returns:
        Ticket instance (new or existing)

    Raises:
        ValueError: If queue not found or inactive
    """
    # Validate queue exists and is active
    queue = await queue_crud.get_queue_by_id(db, queue_id)
    if not queue:
        raise ValueError(f"Queue {queue_id} not found")

    if not queue.active:
        raise ValueError("Queue is not active")

    if queue.is_paused:
        raise ValueError("Queue is currently paused")

    # IDEMPOTENCY CHECK: Does this device already have an active ticket?
    existing_ticket = await ticket_crud.get_active_ticket_for_device(
        db, queue_id, device_token
    )

    if existing_ticket:
        # User already in queue, return existing ticket
        return existing_ticket

    # ATOMIC OPERATION: Increment last_number_issued and get new position
    # CRITICAL: Must handle concurrent updates properly in SQLite
    #
    # Strategy: Use UPDATE ... RETURNING to get the new value atomically
    # This ensures each concurrent request gets a unique position number

    from sqlalchemy import text

    # Use raw SQL with RETURNING clause for true atomicity
    # SQLite will serialize these writes automatically
    result = await db.execute(
        text(
            "UPDATE queues "
            "SET last_number_issued = last_number_issued + 1 "
            "WHERE id = :queue_id "
            "RETURNING last_number_issued"
        ),
        {"queue_id": queue_id}
    )

    # Get the newly incremented value
    new_position = result.scalar_one()

    # Commit the update immediately to release the lock
    await db.commit()

    # Create the ticket with the atomically generated position
    ticket = await ticket_crud.create_ticket(
        db=db,
        queue_id=queue_id,
        device_token=device_token,
        position_number=new_position
    )

    return ticket


async def get_ticket(db: AsyncSession, ticket_id: str) -> Ticket:
    """
    Retrieve a ticket by ID.

    Args:
        db: Database session
        ticket_id: Ticket UUID

    Returns:
        Ticket instance

    Raises:
        ValueError: If ticket not found
    """
    ticket = await ticket_crud.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")
    return ticket


async def verify_ticket(db: AsyncSession, ticket_id: str, queue_id: str) -> dict:
    """
    Verify/complete a ticket and update queue progress.

    CRITICAL: This function handles:
    1. Transition ticket status WAITING -> COMPLETED
    2. Update queue current_position
    3. Calculate and update ETA using Exponential Moving Average (EMA)
    4. Return broadcast data for WebSocket

    Args:
        db: Database session
        ticket_id: Ticket UUID to verify
        queue_id: Queue UUID (for validation)

    Returns:
        Dictionary with broadcast data: {current_position, avg_wait_time}

    Raises:
        ValueError: If ticket not found, wrong queue, or invalid state
    """
    from sqlalchemy import text

    # Fetch ticket
    ticket = await ticket_crud.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")

    # Validate ticket belongs to this queue
    if ticket.queue_id != queue_id:
        raise ValueError("Ticket does not belong to this queue")

    # Validate ticket is in WAITING status
    if ticket.status != TicketStatus.WAITING:
        raise ValueError(f"Ticket is not in WAITING status (current: {ticket.status})")

    # Fetch queue
    queue = await queue_crud.get_queue_by_id(db, queue_id)
    if not queue:
        raise ValueError(f"Queue {queue_id} not found")

    # TRANSITION: WAITING -> COMPLETED
    ticket.status = TicketStatus.COMPLETED
    ticket.completed_at = datetime.utcnow()
    db.add(ticket)

    # UPDATE QUEUE: Set current_position to this ticket's number
    new_current_position = ticket.position_number

    # Increment completed count
    new_completed_count = queue.completed_count + 1

    # ETA CALCULATION: Exponential Moving Average (EMA)
    # Only calculate meaningful average after minimum threshold (10 people)
    now = datetime.utcnow()
    old_avg = queue.avg_wait_time  # In seconds
    delta = int((now - queue.created_at).total_seconds())  # Time since queue creation

    # For better ETA: Calculate time since last scan
    # Note: For MVP, we use a simple approach
    # In production, you'd track last_scan_time per verification

    if new_completed_count < 10:
        # Not enough data yet, keep avg_wait_time = 0 (shows "Calculating...")
        new_avg = 0
    elif old_avg == 0:
        # First meaningful verification (10th person): Use delta as initial value
        new_avg = delta
    else:
        # EMA Formula: new_avg = old_avg * 0.7 + delta * 0.3
        new_avg = int(old_avg * 0.7 + delta * 0.3)

    # Update queue
    queue.current_position = new_current_position
    queue.completed_count = new_completed_count
    queue.avg_wait_time = new_avg
    db.add(queue)

    await db.commit()

    # Prepare broadcast data
    broadcast_data = {
        "type": "queue_update",
        "current_position": new_current_position,
        "avg_wait_time": new_avg
    }

    return broadcast_data


async def mark_no_show(db: AsyncSession, ticket_id: str, queue_id: str) -> dict:
    """
    Mark a ticket as NO_SHOW.

    Unlike verify, this does NOT update current_position.
    It just marks the ticket as a no-show and broadcasts an update.

    Args:
        db: Database session
        ticket_id: Ticket UUID to mark as no-show
        queue_id: Queue UUID (for validation)

    Returns:
        Dictionary with broadcast data

    Raises:
        ValueError: If ticket not found, wrong queue, or invalid state
    """
    # Fetch ticket
    ticket = await ticket_crud.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")

    # Validate ticket belongs to this queue
    if ticket.queue_id != queue_id:
        raise ValueError("Ticket does not belong to this queue")

    # Validate ticket is in WAITING status
    if ticket.status != TicketStatus.WAITING:
        raise ValueError(f"Ticket is not in WAITING status (current: {ticket.status})")

    # TRANSITION: WAITING -> NO_SHOW
    ticket.status = TicketStatus.NO_SHOW
    ticket.completed_at = datetime.utcnow()
    db.add(ticket)

    await db.commit()

    # Fetch queue for current state
    queue = await queue_crud.get_queue_by_id(db, queue_id)

    # Broadcast current state (no position change)
    broadcast_data = {
        "type": "queue_update",
        "current_position": queue.current_position,
        "avg_wait_time": queue.avg_wait_time
    }

    return broadcast_data
