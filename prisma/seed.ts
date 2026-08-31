import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac, createCipheriv, randomBytes, createHash } from "crypto";

const prisma = new PrismaClient();
const products = [
  ["Cold Brew", "cold-brew", "Slow-steeped, chocolatey and ice-cold.", "Cold Brew", 190, "https://images.unsplash.com/photo-1517701604599-bb29b565090c"],
  ["Flat White", "flat-white", "Silky microfoam with a double espresso base.", "Espresso", 180, "https://images.unsplash.com/photo-1509042239860-f550ce710b93"],
  ["Matcha Cloud", "matcha-cloud", "Ceremonial matcha with vanilla foam.", "Matcha", 220, "/images/matcha-cloud.svg"],
  ["Cinnamon Roll", "cinnamon-roll", "Warm, sticky, buttery and unapologetically gooey.", "Pastries", 160, "https://images.unsplash.com/photo-1509365465985-25d11c17e812"],
  ["Berry Basque", "berry-basque", "Creamy burnt cheesecake with berry compote.", "Pastries", 240, "https://images.unsplash.com/photo-1565958011703-44f9829ba187"],
] as const;

function key() {
  const secret = process.env.DATA_ENCRYPTION_KEY;
  if (!secret) throw new Error("DATA_ENCRYPTION_KEY is required for seeding");
  return createHash("sha256").update(secret).digest();
}
function encrypt(value: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
function hash(value: string) {
  const secret = process.env.DATA_HASH_SECRET;
  if (!secret) throw new Error("DATA_HASH_SECRET is required for seeding");
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function main() {
  for (const [name, slug, description, category, price, image] of products) {
    await prisma.product.upsert({ where: { slug }, update: { name, description, category, price, image, available: true }, create: { name, slug, description, category, price, image, available: true } });
  }

  const email = (process.env.ADMIN_EMAIL || "admin@cafe.com").trim().toLowerCase();
  const phone = (process.env.ADMIN_PHONE || "9999999999").replace(/\D/g, "");
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("ADMIN_PASSWORD must be configured and at least 12 characters long.");
  await prisma.user.upsert({
    where: { emailHash: hash(email) },
    update: { emailEncrypted: encrypt(email), nameEncrypted: encrypt(process.env.ADMIN_NAME || "Café Admin"), phoneEncrypted: encrypt(phone), phoneHash: hash(phone), passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", phoneVerifiedAt: new Date() },
    create: { nameEncrypted: encrypt(process.env.ADMIN_NAME || "Café Admin"), emailEncrypted: encrypt(email), emailHash: hash(email), phoneEncrypted: encrypt(phone), phoneHash: hash(phone), passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", phoneVerifiedAt: new Date() },
  });
  const existingSettings = await prisma.cafeSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existingSettings) {
    await prisma.cafeSetting.update({ where: { id: existingSettings.id }, data: { cafeName: "Oat & Ember", tagline: "Takeaway coffee · Surat", address: "Surat, Gujarat", openingHours: "08:00 - 22:00", orderLeadTime: 15, onlinePaymentsEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) } });
  } else {
    await prisma.cafeSetting.create({ data: { cafeName: "Oat & Ember", tagline: "Takeaway coffee · Surat", phone: "", email: "", address: "Surat, Gujarat", openingHours: "08:00 - 22:00", taxPercent: 0, orderLeadTime: 15, whatsappEnabled: false, onlinePaymentsEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) } });
  }
  const offerDefaults = [
    { title: "Welcome brew", code: "WELCOME10", description: "10% off your first order.", discountType: "PERCENT", value: 10, active: true },
    { title: "Coffee + roll", code: "COFFEE160", description: "A simple launch offer for coffee and a cinnamon roll.", discountType: "FLAT", value: 50, active: true },
  ];
  for (const offer of offerDefaults) await prisma.offer.upsert({ where: { code: offer.code }, update: offer, create: offer });
  const staffDefaults = [
    { name: "Café Manager", phone: "9999999998", email: "", role: "MANAGER", shift: "09:00 - 17:00", active: true },
    { name: "Kitchen Lead", phone: "9999999997", email: "", role: "KITCHEN", shift: "10:00 - 18:00", active: true },
    { name: "Counter Lead", phone: "9999999996", email: "", role: "COUNTER", shift: "08:00 - 16:00", active: true },
  ];
  for (const member of staffDefaults) { const exists = await prisma.staff.findFirst({ where: { phone: member.phone } }); if (!exists) await prisma.staff.create({ data: member }); }
  for (const label of ["Counter QR 01", "Table 01"]) { const exists = await prisma.qrEntry.findFirst({ where: { label } }); if (!exists) await prisma.qrEntry.create({ data: { label, kind: label.startsWith("Table") ? "TABLE" : "COUNTER" } }); }

  console.log("🌱 Database seed completed.");
}

main().catch((error) => { console.error("❌ Seed failed:", error); process.exit(1); }).finally(async () => prisma.$disconnect());
