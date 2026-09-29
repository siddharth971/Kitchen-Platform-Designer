import { z } from "zod";

export const BusinessSettingsSchema = z.object({
  businessName: z.string().default("Kitchen Craft Studio"),
  tagline: z.string().default("Custom Countertops & Modular Kitchens"),
  logoUrl: z.string().optional(),
  gstNumber: z.string().default("27AAAAA0000A1Z5"),
  address: z.string().default("Industrial Area, Phase 2, Workshop #14"),
  cityStateZip: z.string().default("Mumbai, Maharashtra 400001"),
  phone: z.string().default("+91 98765 43210"),
  email: z.string().email().or(z.literal("")).default("info@kitchencraft.example"),
  website: z.string().default("www.kitchencraft.example"),
  quoteValidityDays: z.number().int().positive().default(15),
  paymentTerms: z.string().default("50% advance on order confirmation, 40% on fabrication completion, 10% on installation."),
  termsAndConditions: z.string().default(
    "1. Estimate only. Final measurement and price are confirmed on site.\n" +
    "2. Civil and plumbing preparation must be completed by the client prior to installation.\n" +
    "3. Natural stone variations in shade, veining, and pattern are inherent characteristics.\n" +
    "4. Any on-site design alterations will be billed separately."
  ),
  notes: z.string().default("Thank you for your business! Please feel free to contact us for any technical inquiries."),
});

export type BusinessSettings = z.infer<typeof BusinessSettingsSchema>;

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: "CraftStone Countertop Works",
  tagline: "Precision Stone Fabrication & Kitchen Solutions",
  logoUrl: "",
  gstNumber: "27AABCK1234F1Z9",
  address: "Plot 42, Marble & Granite Estate, Sector 7",
  cityStateZip: "Mumbai, MH 400072",
  phone: "+91 98200 12345",
  email: "quotes@craftstone.example",
  website: "www.craftstone.example",
  quoteValidityDays: 15,
  paymentTerms: "50% advance on confirmation, 40% on delivery, 10% after installation.",
  termsAndConditions:
    "1. Estimate only. Final measurement and price are confirmed on site.\n" +
    "2. Natural stone variation in colour, tone, and veining is standard and not a defect.\n" +
    "3. Site must have level flooring and plumbing lines ready before countertop installation.\n" +
    "4. Rates valid for 15 days from quote date.",
  notes: "Specialized in Granite, Quartz, Dekton, and Full Modular Kitchen Joinery.",
};
