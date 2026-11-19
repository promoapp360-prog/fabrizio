/** Shared data: must not be imported from a "use client" component by server pages. */
export const ZONES: { id: string; label: string; d: string; lx: number; ly: number }[] = [
  { id: "neck", label: "Collo", d: "M150 120 L215 105 L225 205 L165 215 Z", lx: 190, ly: 160 },
  { id: "chuck", label: "Spalla", d: "M215 105 L330 95 L330 215 L225 205 Z", lx: 272, ly: 155 },
  { id: "rib", label: "Costata", d: "M330 95 L430 92 L430 175 L330 180 Z", lx: 380, ly: 138 },
  { id: "loin", label: "Lombata", d: "M430 92 L530 95 L530 172 L430 175 Z", lx: 480, ly: 135 },
  { id: "sirloin", label: "Scamone", d: "M530 95 L610 102 L605 175 L530 172 Z", lx: 568, ly: 138 },
  { id: "round", label: "Coscia", d: "M610 102 L680 120 L690 205 L640 270 L590 270 L605 175 Z", lx: 640, ly: 195 },
  { id: "brisket", label: "Petto", d: "M225 205 L330 215 L330 265 L240 262 Z", lx: 280, ly: 238 },
  { id: "plate", label: "Pancia", d: "M330 180 L430 175 L430 262 L330 265 Z", lx: 380, ly: 225 },
  { id: "flank", label: "Fianco", d: "M430 175 L605 175 L590 270 L430 262 Z", lx: 515, ly: 222 },
  { id: "shank", label: "Stinco", d: "M240 262 L300 264 L295 330 L255 330 Z M590 270 L640 270 L635 335 L600 335 Z", lx: 275, ly: 300 },
];
