import Translated from "@/components/public/ServerTranslated";
export default function Meter({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  return <Translated>{(<div><p className="label">{label}</p><div className="flex gap-1" role="img" aria-label={`${label}: ${value} su 5`}>{[1, 2, 3, 4, 5].map(i => <span key={i} className={`h-2 w-8 rounded-full ${i <= value ? "bg-gold" : "bg-cream/10"}`} />)}</div></div>)}</Translated>;
}
