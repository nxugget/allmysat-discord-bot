# Changelog

## [1.0.1] - 2026-07-15

### Fixed
- Pass durations were truncated because AOS/LOS detection used `minElevation` (20° by default) instead of the true horizon (0°).

## [1.0.0] - 2025-07-13

### Added
- Initial release with `/passes`, `/sat`, and `/tle` slash commands.
