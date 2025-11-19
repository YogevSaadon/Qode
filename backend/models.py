"""
SQLAlchemy models for Qode.
Defines Queue and Ticket tables with proper relationships and indexes.
"""
import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Index,
)
from sqlalchemy.orm import relationship
from database import Base


class TicketStatus(str, enum.Enum):
    """Enum for ticket status states."""
    WAITING = "WAITING"
    CALLED = "CALLED"
    SERVING = "SERVING"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"


class Queue(Base):
    """
    Queue model representing a virtual queue.
    Hosts create queues and manage them.
    """
    __tablename__ = "queues"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    host_token = Column(String, nullable=False, unique=True)  # Secure random token
    active = Column(Boolean, default=True, nullable=False)
    is_paused = Column(Boolean, default=False, nullable=False)
    current_position = Column(Integer, default=0, nullable=False)  # Currently being served
    last_number_issued = Column(Integer, default=0, nullable=False)  # For atomic increment
    completed_count = Column(Integer, default=0, nullable=False)  # Number of completed tickets
    avg_wait_time = Column(Integer, default=0, nullable=False)  # Seconds; 0 = calculating
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tickets = relationship("Ticket", back_populates="queue", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Queue(id={self.id}, name={self.name}, active={self.active})>"


class Ticket(Base):
    """
    Ticket model representing a guest's position in a queue.
    The ticket ID is the QR code content.
    """
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    queue_id = Column(String, ForeignKey("queues.id"), nullable=False, index=True)
    device_token = Column(String, nullable=False, index=True)  # User identity
    position_number = Column(Integer, nullable=False)  # Position in line
    status = Column(
        Enum(TicketStatus),
        default=TicketStatus.WAITING,
        nullable=False,
        index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    called_at = Column(DateTime, nullable=True)  # When host called "Next"
    completed_at = Column(DateTime, nullable=True)  # When verified/done

    # Relationships
    queue = relationship("Queue", back_populates="tickets")

    def __repr__(self):
        return f"<Ticket(id={self.id}, position={self.position_number}, status={self.status})>"


# Define composite indexes for common queries
Index("idx_ticket_queue_status", Ticket.queue_id, Ticket.status)
Index("idx_ticket_device_queue", Ticket.device_token, Ticket.queue_id)
