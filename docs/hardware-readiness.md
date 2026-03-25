# Hardware Integration Guide

## When to Move Beyond Simulation

Move to PX4 SITL when:
1. All autonomy modes work correctly in the lightweight sim
2. Safety supervisor has 100% test coverage
3. UI is functional and tested
4. You understand the behavioral edge cases

Move to real hardware when:
1. PX4 SITL testing is complete
2. Safety review checklist is signed off
3. Manual override (RC) is confirmed working
4. You have a controlled, people-free test area

## Implementing a Real Adapter

1. Create a new class implementing `VehicleAdapter` (see `orbit/adapters/base.py`)
2. Connect to MAVLink via `mavsdk` or `pymavlink`
3. Map all abstract methods to MAVLink commands
4. Ensure `emergency_stop()` triggers MAV_CMD_COMPONENT_ARM_DISARM (force disarm)
5. Ensure `get_telemetry()` returns normalized `Telemetry` from MAVLink messages
6. Test with PX4 SITL first, then with real hardware

## Backpack Dock Hardware

The docking system will need:
- ArUco or AprilTag fiducial marker on the dock
- Downward-facing camera on the drone
- Precision landing controller (extends `DockController`)
- Physical alignment mechanism (guide rails or magnetic alignment)
- Charging contacts

All of this is Phase 3+ and requires dedicated mechanical and electrical design.
