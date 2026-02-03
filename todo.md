# ExtremeCloud IQ Monitor - Project TODO

## Backend Infrastructure
- [x] Configure ExtremeCloud IQ API credentials in environment variables
- [x] Implement JWT token management service with expiration tracking
- [x] Build rate limiter middleware with exponential backoff for 429 responses
- [x] Create API proxy service to secure credentials and manage retries
- [x] Implement error handling for network failures vs API errors

## Database Schema
- [x] Create devices table to cache device data
- [x] Create clients table to track connected clients
- [x] Create alerts table to store alert history
- [x] Create api_tokens table to manage ExtremeCloud IQ session tokens

## Authentication & Authorization
- [x] Implement ExtremeCloud IQ login endpoint (POST /login)
- [x] Add token expiration check and refresh logic
- [x] Secure token storage in backend (never expose to frontend)
- [x] Add error handling for failed authentication

## Device Dashboard
- [x] Create device list endpoint with pagination
- [x] Implement traffic light status logic (GREEN/RED/GRAY)
- [x] Display hostname, MAC address, IP address, serial number, product type, software version
- [x] Add real-time status polling or refresh capability
- [x] Build device detail view with full information
- [x] Add device filtering and search functionality

## Remote CLI Diagnostic Tool
- [x] Create CLI execution endpoint (POST /devices/:cli)
- [x] Implement ping command execution with output capture
- [x] Add async operation handling for bulk commands
- [x] Build CLI output display UI with formatting
- [x] Add command history tracking
- [ ] Implement timeout handling for long-running commands

## Connected Clients View
- [x] Create clients list endpoint
- [x] Display hostname, IP address, SSID, VLAN, OS type
- [ ] Add client filtering by device or SSID
- [ ] Implement client detail view
- [x] Add connection status indicators

## Alert Monitoring
- [x] Create alerts list endpoint with severity filtering
- [x] Implement alert feed UI with real-time updates
- [x] Add severity-based color coding
- [ ] Build alert detail view with full context
- [x] Add alert acknowledgment/dismissal functionality
- [x] Implement alert filtering by category and severity

## Frontend UI Components
- [x] Build dashboard layout with sidebar navigation
- [x] Create device dashboard page
- [x] Create CLI diagnostic tool page
- [x] Create clients management page
- [x] Create alerts monitoring page
- [x] Implement loading states and skeletons
- [ ] Add error boundaries and error messages
- [x] Build responsive mobile design

## Testing & Quality
- [ ] Write tests for JWT token management
- [ ] Write tests for rate limiter logic
- [ ] Write tests for status logic (GREEN/RED/GRAY)
- [ ] Write tests for API proxy error handling
- [ ] Write tests for device dashboard queries
- [ ] Write tests for CLI command execution
- [ ] Write tests for alert filtering

## Deployment & Documentation
- [ ] Document API credential setup process
- [ ] Create user guide for dashboard features
- [ ] Document CLI diagnostic tool usage
- [ ] Add inline code documentation
- [ ] Verify all error states are handled gracefully
- [ ] Test rate limiting behavior
- [ ] Verify token refresh works correctly

## Known Issues & Improvements
- (none yet)

## Uptime & Availability Monitoring (NEW)
- [x] Create device_availability table to track up/down history with timestamps
- [x] Create api_errors table to track API failures separately from device state
- [x] Implement availability tracking service to record device state changes
- [x] Build uptime calculation engine for different periods (minutes, hours, days, month)
- [x] Create availability report endpoint with period filtering
- [x] Distinguish between device downtime and API unavailability in reports
- [x] Build availability indicator component (percentage badge)
- [x] Create period selector (last 5 min, 1 hour, 24 hours, 7 days, 30 days)
- [ ] Implement availability chart showing up/down timeline
- [x] Build detailed outage report showing duration and cause
- [x] Add availability metrics to device detail page

## UI Improvements
- [x] Add Uptime & Availability Monitoring to left sidebar navigation

## Bug Fixes
- [x] Fix Availability Overview showing all zeros - integrated automatic state recording into device sync

## Availability Tracking Improvements
- [x] Handle API failures gracefully without marking devices as DOWN
- [x] Use last_connect_time to infer device state when API fails
- [x] Track API errors separately from device state changes
- [x] Implement UNKNOWN status for devices when API unavailable and no recent data
- [x] Update availability calculation to account for API error periods

## Critical Bugs - Availability Calculation
- [x] Fix uptime showing 0% in Availability Overview - recalculate duration from consecutive timestamps
- [x] Fix uptime showing 100% in device detail reports - same fix applied
- [x] Debug getDevicesStats endpoint - fixed to calculate duration correctly
- [x] Debug getAvailabilityReport endpoint - fixed to calculate duration correctly

## UI Improvements (Current)
- [x] Add device name filter field to Availability Overview

## Current Bugs
- [x] Fix devices.detail endpoint returning undefined data - added fallback to cached device


## Advanced Availability Features (AirWave Parity)
- [x] Extend database schema for polling config, downtime windows, and event counters
- [x] Implement Background Polling Service (automatic polling every 5-10 min)
- [x] Add Fast Polling Logic with exponential backoff retries
- [x] Implement Event Counter to detect flapping (UP↔DOWN transitions)
- [x] Add Planned Downtime windows with exclusion from uptime calculations
- [x] Build Webhook/Trap Handler for immediate state change notifications
- [ ] Update availability reports to include event counts and flapping detection
- [ ] Create admin UI for polling configuration and planned downtime management
- [x] Add comprehensive tests for new features (19 tests, all passing)


## Report Export Feature (NEW)
- [x] Create report generation service for CSV export
- [x] Create report generation service for PDF export
- [x] Add tRPC endpoints for CSV export
- [x] Add tRPC endpoints for PDF export
- [x] Build export UI button and dialog
- [x] Test export functionality (all 71 tests passing)
- [x] Add single-device export endpoints to availability router
- [x] Implement export buttons in Availability Report page
- [x] Add tests for export functionality (16 new tests passing)


## Current Bugs (Active)
- [x] Fix "Failed to fetch clients" error on /availability/:deviceId page - added graceful error handling with cached fallback
- [x] Fix PDF/CSV export error - use generateReportData to create correct ReportData format for export services

- [ ] Fix device sync to properly capture hostname and productType from XIQ API (currently showing deviceId and "Unknown")
