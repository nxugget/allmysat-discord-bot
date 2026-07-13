# AllMySat Discord Bot

Discord bot for satellite tracking. Part of the [AllMySat](https://allmysat.com) ecosystem.

[Add to your server](https://discord.com/oauth2/authorize?client_id=1526127886510325770&scope=bot%20applications.commands)

## Commands

### /sat

Search a satellite by name and get its details.

```
/sat query:ISS
```

Returns name, NORAD ID, type, orbit, status, category, country, launch date and launch site.

### /tle

Get the latest Two-Line Element set for a satellite.

```
/tle query:ISS
```

### /passes

See upcoming satellite passes over a city for the next 48 hours.

```
/passes query:ISS city:Paris min_elevation:20
```

Shows rise and set times with azimuth direction and maximum elevation. For geostationary satellites, shows the fixed position instead.
