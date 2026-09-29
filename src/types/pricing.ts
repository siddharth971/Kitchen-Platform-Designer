export interface PricingConfig {
  basis: "sq-ft" | "running-foot";
  billOn: "gross" | "net";
  wastePercent: number;
  materialRates: Record<string, number>; // per basis unit
  edgePerRunningFt: number;
  backsplashPerSqFt: number;
  cabinetPerRunningFt: number;
  cutoutRates: Record<string, number>; // sink, hob, custom
  polishPerRunningFt?: number;
  installation: number;
  labour: number;
  taxPercent: number; // configurable, no assumed default
  discount: {
    type: "percent" | "flat";
    value: number;
  };
  roundTo: number;
}
