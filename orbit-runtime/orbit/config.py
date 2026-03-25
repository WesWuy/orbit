"""Orbit configuration — loaded from environment variables with safe defaults."""

from pydantic_settings import BaseSettings


class OrbitConfig(BaseSettings):
    """Central configuration for the Orbit server."""

    model_config = {"env_prefix": "ORBIT_", "env_file": ".env"}

    # Server
    env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000

    # Simulation
    sim_tick_rate_hz: float = 50.0
    sim_realtime: bool = True

    # Safety limits — these are hard ceilings, not suggestions
    max_speed_ms: float = 5.0
    max_altitude_m: float = 30.0
    min_altitude_m: float = 1.0
    battery_warn_pct: float = 20.0
    battery_critical_pct: float = 10.0
    geofence_radius_m: float = 100.0

    # Logging
    log_level: str = "INFO"
    log_telemetry: bool = True


config = OrbitConfig()
