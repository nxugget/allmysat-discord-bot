import {
  twoline2satrec,
  propagate,
  gstime,
  jday,
  eciToEcf,
  ecfToLookAngles,
  radiansToDegrees,
} from "satellite.js";
import { getTleByNoradId } from "./satellite.js";
import { PASSES_WINDOW_MS, PASSES_STEP_MS, PASSES_MAX_COUNT } from "../lib/constants.js";

export interface PassInfo {
  rise: Date;
  max: Date;
  set: Date;
  maxElevation: number;
  azimuthRise: number;
  azimuthMax: number;
  azimuthSet: number;
}

export interface GeoInfo {
  elevation: number;
  azimuth: number;
}

function computeGeoPosition(
  line1: string,
  line2: string,
  lat: number,
  lon: number
): GeoInfo | null {
  const satrec = twoline2satrec(line1, line2);
  const now = new Date();

  const pv = propagate(
    satrec,
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  );

  if (!pv || !pv.position) return null;

  const gmst = gstime(
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )
  );

  const ecf = eciToEcf(pv.position, gmst);
  const lookAngles = ecfToLookAngles(
    { longitude: (lon * Math.PI) / 180, latitude: (lat * Math.PI) / 180, height: 0 },
    ecf
  );

  return {
    elevation: Math.round(radiansToDegrees(lookAngles.elevation) * 10) / 10,
    azimuth: Math.round(radiansToDegrees(lookAngles.azimuth)),
  };
}

export async function predictPasses(
  noradId: number,
  lat: number,
  lon: number,
  minElevation = 20
): Promise<{
  passes: PassInfo[];
  isGeo: boolean;
  geoInfo: GeoInfo | null;
  satelliteName: string;
}> {
  const tleData = await getTleByNoradId(noradId);
  if (!tleData) throw new Error("No TLE available for this satellite.");

  const isGeo = tleData.orbit === "GEO";

  if (isGeo) {
    const geoPos = computeGeoPosition(tleData.tle_line1, tleData.tle_line2, lat, lon);
    return { passes: [], isGeo: true, geoInfo: geoPos, satelliteName: tleData.satelliteName };
  }

  const satrec = twoline2satrec(tleData.tle_line1, tleData.tle_line2);
  const now = new Date();
  const endTime = new Date(now.getTime() + PASSES_WINDOW_MS);

  const observerGd = {
    longitude: (lon * Math.PI) / 180,
    latitude: (lat * Math.PI) / 180,
    height: 0,
  };

  const passes: PassInfo[] = [];
  let inPass = false;
  let passStart: Date | null = null;
  let passMaxElevation = 0;
  let passMaxTime: Date | null = null;
  let passAzimuthRise = 0;
  let passAzimuthMax = 0;
  let passLastAzimuth = 0;

  for (
    let t = new Date(now);
    t <= endTime;
    t = new Date(t.getTime() + PASSES_STEP_MS)
  ) {
    const pv = propagate(
      satrec,
      t.getUTCFullYear(),
      t.getUTCMonth() + 1,
      t.getUTCDate(),
      t.getUTCHours(),
      t.getUTCMinutes(),
      t.getUTCSeconds()
    );

    if (!pv || !pv.position) continue;

    const gmst = gstime(
      jday(
        t.getUTCFullYear(),
        t.getUTCMonth() + 1,
        t.getUTCDate(),
        t.getUTCHours(),
        t.getUTCMinutes(),
        t.getUTCSeconds()
      )
    );

    const ecf = eciToEcf(pv.position, gmst);
    const lookAngles = ecfToLookAngles(observerGd, ecf);

    const elevation = radiansToDegrees(lookAngles.elevation);
    const azimuth = radiansToDegrees(lookAngles.azimuth);

    if (elevation >= 0) {
      if (!inPass) {
        inPass = true;
        passStart = new Date(t);
        passMaxElevation = elevation;
        passMaxTime = new Date(t);
        passAzimuthRise = azimuth;
        passAzimuthMax = azimuth;
      } else {
        if (elevation > passMaxElevation) {
          passMaxElevation = elevation;
          passMaxTime = new Date(t);
          passAzimuthMax = azimuth;
        }
        passLastAzimuth = azimuth;
      }
    } else if (inPass) {
      if (passMaxElevation >= minElevation) {
        passes.push({
          rise: passStart!,
          max: passMaxTime!,
          set: new Date(t),
          maxElevation: Math.round(passMaxElevation * 10) / 10,
          azimuthRise: Math.round(passAzimuthRise),
          azimuthMax: Math.round(passAzimuthMax),
          azimuthSet: Math.round(passLastAzimuth),
        });
      }

      inPass = false;
      passStart = null;
      passMaxElevation = 0;
      passMaxTime = null;
      passAzimuthRise = 0;
      passAzimuthMax = 0;
      passLastAzimuth = 0;

      if (passes.length >= PASSES_MAX_COUNT) break;
    }
  }

  return { passes, isGeo: false, geoInfo: null, satelliteName: tleData.satelliteName };
}
