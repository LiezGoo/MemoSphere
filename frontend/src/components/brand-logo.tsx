import Image from 'next/image';

export default function BrandLogo({ className = '' }: { className?: string }) {
  return <Image className={`brand-logo-image ${className}`} src="/images/logoo.png" alt="Alaala logo" width={38} height={38} priority />;
}
