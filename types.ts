export enum VehicleType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
  TRUCK = 'TRUCK'
}

export interface ParkingTicket {
  id: string;
  licensePlate: string;
  vehicleType: VehicleType;
  entryTime: Date;
  exitTime?: Date;
  fee?: number;
  status: 'ACTIVE' | 'COMPLETED';
  imageUrl?: string; // For the AI snapshot
}

export interface Stats {
  totalRevenue: number;
  occupiedSpots: number;
  totalSpots: number;
  todayTransactions: number;
}

export interface OcrResult {
  licensePlate: string;
  vehicleType: VehicleType;
  confidence: number;
}
