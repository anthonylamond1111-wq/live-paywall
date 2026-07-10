type BrandLogoProps = {
  size?: 'nav' | 'fullscreen' | 'intro';
  className?: string;
};

const sizeClasses = {
  nav: 'text-xl sm:text-4xl sm:tracking-[-2px]',
  fullscreen: 'text-sm sm:text-lg',
  intro: 'text-4xl sm:text-6xl',
};

export default function BrandLogo({ size = 'nav', className = '' }: BrandLogoProps) {
  return (
    <span
      className={`brand-logo-flow font-black tracking-tight ${sizeClasses[size]} ${className}`}
    >
      UFC ACCESS
    </span>
  );
}
