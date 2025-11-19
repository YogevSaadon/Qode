"""
ETA Service - Estimated Time of Arrival calculations.
Provides human-readable time estimates for queue positions.
"""


def calculate_eta_string(position: int, current_position: int, avg_wait_time: int) -> str:
    """
    Calculate estimated wait time as a human-readable string.

    Args:
        position: The user's position number in queue
        current_position: The current position being served
        avg_wait_time: Average time per person in seconds

    Returns:
        Human-readable ETA string (e.g., "5 minutes", "Calculating...")
    """
    # Cold start: No data yet
    if avg_wait_time == 0:
        return "Calculating..."

    # Already being served or past
    if position <= current_position:
        return "Your turn!"

    # Calculate people ahead
    people_ahead = position - current_position

    # Calculate total wait time in seconds
    total_seconds = people_ahead * avg_wait_time

    # Convert to minutes (round up)
    minutes = (total_seconds + 59) // 60  # Ceiling division

    # Format output
    if minutes < 1:
        return "Less than 1 minute"
    elif minutes == 1:
        return "About 1 minute"
    elif minutes < 60:
        return f"About {minutes} minutes"
    else:
        hours = minutes // 60
        remaining_minutes = minutes % 60
        if hours == 1 and remaining_minutes == 0:
            return "About 1 hour"
        elif remaining_minutes == 0:
            return f"About {hours} hours"
        else:
            return f"About {hours}h {remaining_minutes}m"


def calculate_people_ahead(position: int, current_position: int) -> int:
    """
    Calculate number of people ahead in queue.

    Args:
        position: The user's position number
        current_position: The current position being served

    Returns:
        Number of people ahead (0 or positive integer)
    """
    people_ahead = position - current_position
    return max(0, people_ahead)
