import Image from "next/image";

/**
 * Emblème Tiers-État : le « T » au bonnet phrygien (PNG à fond transparent).
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/logo.png"
      alt=""
      width={size}
      height={size}
      sizes={`${size * 2}px`}
      className={`shrink-0 ${className}`}
      priority={size >= 64}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={30} />
      <span className="text-[1.05rem] font-bold tracking-tight">Tiers-État</span>
    </span>
  );
}
