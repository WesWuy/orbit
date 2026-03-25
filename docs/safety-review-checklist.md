# Safety Review Checklist — Real-World Readiness

This checklist must be completed before ANY real-world testing.

## Pre-Flight Safety

- [ ] Emergency stop physically tested and confirmed working
- [ ] Manual override (RC transmitter) tested independently
- [ ] Battery failsafe triggers auto-land at correct threshold
- [ ] Link-loss failsafe triggers auto-land within 5 seconds
- [ ] Speed limits confirmed in hardware (not just software)
- [ ] Altitude limits confirmed in hardware
- [ ] Geofence tested and confirmed
- [ ] Propeller guards installed
- [ ] Weight and balance checked
- [ ] Battery voltage and health verified

## Software Safety

- [ ] All safety supervisor tests pass
- [ ] E-stop latency measured (must be < 100ms)
- [ ] Safety supervisor cannot be bypassed by any code path
- [ ] All mode transitions validated
- [ ] Battery drain model calibrated to real hardware
- [ ] Telemetry latency measured and acceptable
- [ ] WebSocket disconnection triggers safe fallback

## Operational Safety

- [ ] Test area is clear of people (minimum 10m exclusion zone)
- [ ] Spotter present and briefed
- [ ] RC transmitter as backup control
- [ ] Wind conditions within limits
- [ ] Liability insurance confirmed
- [ ] Local regulations reviewed and complied with
- [ ] Flight log recording confirmed

## Review Sign-Off

- [ ] Safety review completed by: _______________
- [ ] Date: _______________
- [ ] Approved for: [ ] Indoor testing only [ ] Outdoor testing (controlled area)
