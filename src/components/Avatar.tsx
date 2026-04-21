type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-20 h-20 text-3xl",
  xl: "w-32 h-32 text-5xl",
};

type Props = {
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  size?: Size;
};

export function Avatar({ displayName, avatarColor, avatarUrl, size = "md" }: Props) {
  const cls = sizeClasses[size];
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${cls} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold text-lumm-dark shrink-0`}
      style={{ backgroundColor: avatarColor }}
    >
      {initial}
    </div>
  );
}
