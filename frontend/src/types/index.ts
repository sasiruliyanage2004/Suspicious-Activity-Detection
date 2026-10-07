/**
 * Aethra Vision Core - Enterprise TypeScript Definitions
 * Standardized data models for Real-time Surveillance Command Center
 */

export type AlarmSeverity = 'CRITICAL' | 'WARNING' | 'RESOLVED' | 'INFO';

export type ThreatBehaviorType = 
  | 'Gun Detected'
  | 'Knife Detected'
  | 'Weapon Detected'
  | 'Suspicious Activity'
  | 'Suspicious Baggage Detected'
  | 'Tripwire Intrusion'
  | 'Falling Detected'
  | 'Smoking Detected'
  | 'Violence Detected'
  | 'People Gathering Detected'
  | 'Cross-Camera Handoff'
  | 'Person Detected';

export interface ThreatAlert {
  id: string | number;
  camera: string;
  camNumericId: number;
  threat: ThreatBehaviorType | string;
  level: AlarmSeverity;
  time: string;
  timestampValue: number;
  confidence: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  recordingPath?: string | null;
  details?: string;
}

export interface CameraNode {
  id: number;
  code: string;
  location: string;
  streamUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
  latencyMs?: number;
  fps?: number;
  resolution?: string;
  threat?: {
    label: string;
    confidence: number;
    x: number;
    y: number;
  } | null;
}

export interface ZoneCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RestrictedZone {
  id?: number;
  camera_id: number;
  zone_label: string;
  coordinates: ZoneCoordinates;
  alarm_level: 'CRITICAL' | 'WARNING';
}

export interface BiometricProfile {
  id: string;
  name: string;
  department: string;
  clearance: 'Tier-1 VIP Executive' | 'Tier-2 Staff Authority' | 'Tier-3 Contractor Access' | 'Tier-4 Visitor Escort';
  gender: 'Male' | 'Female';
  active: boolean;
  registered_date: string;
  image_url?: string;
}

export interface TelemetryMetrics {
  encryption: 'AES-256' | 'AES-128';
  latencyMs: number;
  cpuLoadPercent: number;
  memUsageGb: number;
  frameRateFps: number;
  diskSpacePercent: number;
  camerasOnline: number;
  camerasTotal: number;
  activeAlertsCount: number;
}

export interface ALPRDetection {
  plateNumber: string;
  confidence: number;
  vehicleType: 'Car' | 'Van' | 'SUV' | 'Motorcycle' | 'Bus' | 'Truck';
  timestamp: string;
  cameraId: string;
}
