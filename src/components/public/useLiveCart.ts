"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { MenuData } from "@/lib/menu";
import { lineCents, isWeighted } from "@/lib/pricing";
import type { CartLine } from "./MenuBrowser";

/** Keep an open cart consistent with price, availability and variant changes. */
export function useLiveCart(menu: MenuData, cart: CartLine[], setCart: Dispatch<SetStateAction<CartLine[]>>, channel: "TABLE" | "TAKEAWAY" | "DELIVERY") {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const next = cart.flatMap(line => {
      const p = menu.products.find(p => p.id === line.productId);
      if (!p || !p.available || p.pricePending || !p.channels.includes(channel)) return [];
      if (isWeighted(p.priceMode) && !menu.portionWeightsGrams.includes(line.weightGrams ?? 0)) return [];
      const opts = p.groups.flatMap(g => g.options).filter(o => line.optionIds.includes(o.id));
      const valid = p.groups.every(g => { const count = opts.filter(o => g.options.some(x => x.id === o.id)).length; return count >= g.min && count <= g.max; });
      if (!valid || (p.hasCooking && !line.cooking)) return [];
      return [{ ...line, name: p.name, optionIds: opts.map(o => o.id), optionNames: opts.map(o => o.name),
        cooking: p.hasCooking ? line.cooking : undefined, weighted: isWeighted(p.priceMode),
        weightGrams: isWeighted(p.priceMode) ? line.weightGrams : undefined,
        estCents: lineCents({ priceMode: p.priceMode, unitCents: p.priceCents, quantity: line.quantity, weightGrams: line.weightGrams, optionsCents: opts.reduce((sum, o) => sum + o.priceCents, 0) }) }];
    });
    if (JSON.stringify(next) !== JSON.stringify(cart)) {
      setCart(next);
      setNotice("Il menu è stato aggiornato: prezzi ricalcolati e prodotti non più ordinabili rimossi dal carrello. Controlla prima di confermare.");
    }
  }, [menu, cart, setCart, channel]);
  return notice;
}
