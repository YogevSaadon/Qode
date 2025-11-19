"""
Pydantic schemas for request/response validation.
Defines the API contract for Qode.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from models import TicketStatus


# ============================================================================
# Queue Schemas
# ============================================================================

class QueueCreate(BaseModel):
    """Request schema for creating a new queue."""
    name: str = Field(..., min_length=1, max_length=100, description="Queue name")


class QueueResponse(BaseModel):
    """Response schema for queue data."""
    id: str
    name: str
    host_token: str  # ONLY returned on creation, not on GET
    active: bool
    is_paused: bool
    current_position: int
    last_number_issued: int
    avg_wait_time: int
    created_at: datetime

    class Config:
        from_attributes = True  # Allows Pydantic v2 to work with ORM models


class QueuePublicResponse(BaseModel):
    """Public queue info (without sensitive host_token)."""
    id: str
    name: str
    active: bool
    is_paused: bool
    current_position: int
    avg_wait_time: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Ticket Schemas
# ============================================================================

class TicketCreate(BaseModel):
    """Request schema for joining a queue."""
    queue_id: str
    device_token: str = Field(..., min_length=1, description="Anonymous device identifier")


class TicketResponse(BaseModel):
    """Response schema for ticket data."""
    id: str
    queue_id: str
    device_token: str
    position_number: int
    status: TicketStatus
    created_at: datetime
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketWithETA(BaseModel):
    """Ticket response with calculated ETA."""
    id: str
    queue_id: str
    position_number: int
    status: TicketStatus
    created_at: datetime
    called_at: Optional[datetime] = None
    estimated_wait_seconds: Optional[int] = None
    people_ahead: int

    class Config:
        from_attributes = True


# ============================================================================
# Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
