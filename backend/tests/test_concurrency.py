"""
CRITICAL CONCURRENCY TEST
Tests atomic ticket creation under high concurrent load.

This test MUST PASS before any frontend implementation.
"""
import asyncio
import pytest
import pytest_asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from database import Base
from services import queue_service, ticket_service


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Create a test database session."""
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        yield session


@pytest.mark.asyncio
async def test_concurrent_join_queue_no_duplicates(db_engine):
    """
    CRITICAL TEST: 50 concurrent users join the same queue.

    Expected behavior:
    - Exactly 50 tickets created
    - Position numbers: 1 through 50
    - NO duplicate position numbers
    - NO gaps in sequence

    This test verifies:
    1. Atomic increment of last_number_issued
    2. No race conditions during ticket creation
    3. Database transaction isolation
    """
    # Create session factory for test
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    # Create a test queue
    async with async_session() as session:
        queue = await queue_service.create_new_queue(
            db=session,
            name="Concurrency Test Queue"
        )
        queue_id = queue.id

    # Generate 50 unique device tokens
    num_users = 50
    device_tokens = [str(uuid.uuid4()) for _ in range(num_users)]

    # Create async tasks for concurrent joins
    async def join_as_user(device_token: str):
        """Simulate a user joining the queue."""
        # Each task needs its own session
        async with async_session() as session:
            ticket = await ticket_service.join_queue(
                db=session,
                queue_id=queue_id,
                device_token=device_token
            )
            return ticket

    # Execute all joins concurrently
    print(f"\nStarting {num_users} concurrent join operations...")
    tickets = await asyncio.gather(*[
        join_as_user(token) for token in device_tokens
    ])

    print(f"All {len(tickets)} operations completed!")

    # ASSERTIONS
    # 1. Check we got exactly the expected number of tickets
    assert len(tickets) == num_users, \
        f"Expected {num_users} tickets, got {len(tickets)}"

    # 2. Extract all position numbers
    positions = [ticket.position_number for ticket in tickets]
    positions_sorted = sorted(positions)

    print(f"Position numbers: {positions_sorted}")

    # 3. Check for NO duplicates
    unique_positions = set(positions)
    assert len(unique_positions) == num_users, \
        f"Found duplicate positions! Expected {num_users} unique, got {len(unique_positions)}"

    # 4. Check positions are sequential from 1 to num_users
    expected_positions = list(range(1, num_users + 1))
    assert positions_sorted == expected_positions, \
        f"Position numbers are not sequential! Expected {expected_positions}, got {positions_sorted}"

    # 5. Verify all tickets have WAITING status
    statuses = [ticket.status for ticket in tickets]
    from models import TicketStatus
    assert all(status == TicketStatus.WAITING for status in statuses), \
        "Not all tickets have WAITING status"

    print(f"[PASS] CONCURRENCY TEST PASSED!")
    print(f"   - {num_users} users joined successfully")
    print(f"   - Position numbers: 1 to {num_users}")
    print(f"   - NO duplicates detected")
    print(f"   - All tickets in WAITING status")


@pytest.mark.asyncio
async def test_idempotency_same_device_joins_twice(db_engine):
    """
    Test idempotency: Same device joining twice should return same ticket.
    """
    # Create session factory for test
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    # Create a test queue
    async with async_session() as session:
        queue = await queue_service.create_new_queue(
            db=session,
            name="Idempotency Test Queue"
        )
        queue_id = queue.id

    device_token = str(uuid.uuid4())

    # First join
    async with async_session() as session:
        ticket1 = await ticket_service.join_queue(
            db=session,
            queue_id=queue_id,
            device_token=device_token
        )

    # Second join (same device)
    async with async_session() as session:
        ticket2 = await ticket_service.join_queue(
            db=session,
            queue_id=queue_id,
            device_token=device_token
        )

    # Should return the SAME ticket
    assert ticket1.id == ticket2.id, \
        "Same device should receive same ticket"

    assert ticket1.position_number == ticket2.position_number, \
        "Position number should not change"

    print("[PASS] IDEMPOTENCY TEST PASSED!")
    print(f"   - Same device got same ticket: {ticket1.id}")
    print(f"   - Position: {ticket1.position_number}")
