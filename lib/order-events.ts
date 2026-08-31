export type OrderEvent = {
  type: "ORDER_CREATED" | "ORDER_STATUS_CHANGED";
  orderId: string;
  status: string;
  createdAt: string;
  customerName?: string;
  total?: number;
  paymentMethod?: string;
};

type Listener = (event: OrderEvent) => void;

type GlobalBus = typeof globalThis & {
  __oatEmberOrderListeners?: Set<Listener>;
};
const globalBus = globalThis as GlobalBus;
const listeners = globalBus.__oatEmberOrderListeners ?? new Set<Listener>();
globalBus.__oatEmberOrderListeners = listeners;

export function subscribeToOrderEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishOrderEvent(event: OrderEvent) {
  listeners.forEach((listener) => listener(event));
}
