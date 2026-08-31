import { decrypt } from '@/lib/crypto';

function maskPhone(value: string) {
  return value.length >= 4 ? `******${value.slice(-4)}` : '';
}

function publicFulfillment(value: string) {
  try {
    const data = JSON.parse(value || '{}');
    if (data.type === 'VEHICLE') {
      const plate = String(data.licensePlate || '');
      return JSON.stringify({ type: 'VEHICLE', vehicleType: data.vehicleType, color: data.color, arrivalTime: data.arrivalTime, licensePlate: plate.length > 4 ? `•••• ${plate.slice(-4)}` : plate });
    }
    return JSON.stringify({ type: 'CORPORATE', companyName: data.companyName, floorRoomBuilding: data.floorRoomBuilding });
  } catch {
    return '{}';
  }
}

export function orderForClient(order: any, includeSensitive = false) {
  const phone = decrypt(order.customerPhoneEncrypted) || '';
  return {
    id: order.id,
    trackingToken: order.trackingToken,
    customerName: decrypt(order.customerNameEncrypted) || 'Customer',
    customerEmail: includeSensitive ? (decrypt(order.customerEmailEncrypted) || '') : '',
    customerPhone: includeSensitive ? phone : maskPhone(phone),
    fulfillmentType: order.fulfillmentType,
    fulfillmentData: includeSensitive ? (decrypt(order.fulfillmentData) || '{}') : publicFulfillment(decrypt(order.fulfillmentData) || '{}'),
    subtotal: order.subtotal,
    total: order.total,
    currency: order.currency,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    cashOtpVerifiedAt: order.cashOtpVerifiedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items || []).map((item: any) => ({ id: item.id, productId: item.productId, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, customizations: item.customizations })),
  };
}
