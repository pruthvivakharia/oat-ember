export type Role = "ADMIN" | "CUSTOMER";
export type FulfillmentType = "VEHICLE" | "CORPORATE";
export type PaymentMethod = "RAZORPAY" | "CASH";
export type PaymentStatus = "PENDING" | "PAID" | "CASH_DUE";
export type OrderStatus =
  | "RECEIVED"
  | "BREWING"
  | "PACKED"
  | "COMPLETED"
  | "REJECTED";
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  image: string;
  available: boolean;
}
export interface Customizations {
  sweetness: number;
  shots: number;
  milk?: string;
}

export interface CartItem extends Product {
  quantity: number;
  customizations: Customizations;
}

export interface FulfillmentData {
  type: FulfillmentType;
  vehicleType?: "Car" | "Bike";
  color?: string;
  licensePlate?: string;
  arrivalTime?: string;
  companyName?: string;
  floorRoomBuilding?: string;
  contactPerson?: string;
  gstin?: string;
  bulkNotes?: string;
}
export interface OrderView {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  fulfillmentData: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    customizations?: string | null;
  }[];
}
