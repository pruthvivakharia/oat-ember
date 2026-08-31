import { cleanPhone, normalizeEmail } from "@/lib/crypto";
import { FulfillmentData } from "@/types";

export const ORDERING_TIME_ZONE =
  process.env.ORDERING_TIME_ZONE || "Asia/Kolkata";
const ORDERING_START_HOUR = Number(process.env.ORDERING_START_HOUR || 7);
const ORDERING_END_HOUR = Number(process.env.ORDERING_END_HOUR || 22);

export function validateCustomerInput(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}) {
  const name = String(input.name ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const email = normalizeEmail(
    input.email == null ? undefined : String(input.email),
  );
  const phone = cleanPhone(
    input.phone == null ? undefined : String(input.phone),
  );
  if (name.length < 2 || name.length > 80)
    throw new Error("Please enter a valid name.");
  if (email && email.length > 160)
    throw new Error("Please enter a valid email address.");
  if (!phone || !/^[6-9]\d{9}$/.test(phone))
    throw new Error("Please enter a valid 10-digit Indian mobile number.");
  return { name, email: email || null, phone };
}

const vehicleTypes = new Set(["Car", "Bike"]);
const arrivalTimes = new Set(["5 min", "10 min", "15 min", "20 min"]);

function text(value: unknown, max: number, label: string, required = false) {
  const valueText = String(value ?? "").trim();
  if (required && !valueText) throw new Error(`${label} is required.`);
  if (valueText.length > max) throw new Error(`${label} is too long.`);
  return valueText;
}

export function validateFulfillment(input: unknown): FulfillmentData {
  if (!input || typeof input !== "object")
    throw new Error("Choose a handover method.");
  const b = input as Record<string, unknown>;
  const type = String(b.type || "").toUpperCase();
  if (type === "VEHICLE") {
    const vehicleType = String(b.vehicleType || "");
    const arrivalTime = String(b.arrivalTime || "");
    if (!vehicleTypes.has(vehicleType) || !arrivalTimes.has(arrivalTime))
      throw new Error("Invalid vehicle handover details.");
    const color = text(b.color, 40, "Vehicle colour", true);
    const licensePlate = text(
      b.licensePlate,
      24,
      "License plate",
      true,
    ).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9 .-]{2,23}$/.test(licensePlate))
      throw new Error("Enter a valid vehicle registration number.");
    return {
      type: "VEHICLE",
      vehicleType: vehicleType as "Car" | "Bike",
      color,
      licensePlate,
      arrivalTime,
    };
  }
  if (type === "CORPORATE") {
    return {
      type: "CORPORATE",
      companyName: text(b.companyName, 100, "Company name", true),
      floorRoomBuilding: text(
        b.floorRoomBuilding,
        100,
        "Floor / room / building",
        true,
      ),
      contactPerson: text(b.contactPerson, 80, "Contact person", true),
      gstin: text(b.gstin, 32, "GSTIN"),
      bulkNotes: text(b.bulkNotes, 240, "Group order notes", true),
    };
  }
  throw new Error("Choose a valid handover method.");
}

export function normalizeCustomizations(raw: unknown, category: string) {
  const b =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sweetness = Number(b.sweetness);
  const shots = Number(b.shots);
  if (
    ![0, 25, 50, 100].includes(sweetness) ||
    !Number.isInteger(shots) ||
    shots < 0 ||
    shots > 4
  ) {
    throw new Error("Invalid drink customization.");
  }
  const supportsMilk = ["Espresso", "Matcha"].includes(category);
  const result: { sweetness: 0 | 25 | 50 | 100; shots: number; milk?: string } = {
    sweetness: sweetness as 0 | 25 | 50 | 100,
    shots,
  };
  if (supportsMilk) {
    const milk = String(b.milk || "Whole milk");
    if (
      !["Whole milk", "Oat milk", "Almond milk", "Coconut milk"].includes(milk)
    )
      throw new Error("Invalid milk selection.");
    result.milk = milk;
  }
  return result;
}

export function assertOrderingOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: ORDERING_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  if (ORDERING_START_HOUR < ORDERING_END_HOUR) {
    if (hour < ORDERING_START_HOUR || hour >= ORDERING_END_HOUR) {
      throw new Error(
        `Online ordering is currently closed. We're open from ${ORDERING_START_HOUR}:00 to ${ORDERING_END_HOUR}:00.`,
      );
    }
  }
}
