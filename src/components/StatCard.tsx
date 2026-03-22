type Props = {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
};

export function StatCard({ label, value, subtitle, accent }: Props) {
  return (
    <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5">
      <p className="text-sm text-lumm-text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-lumm-gold" : "text-lumm-text-primary"}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-lumm-text-secondary mt-1">{subtitle}</p>}
    </div>
  );
}
