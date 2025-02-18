import { cn } from '@/utils/utils'
import Image from 'next/image'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center mx-auto md:mx-0', className)}>
      <Image
        src="/img/huzzar-logo.png"
        alt="Huzzar Logo"
        width={140}
        height={40}
        priority
      />
    </div>
  )
}

export default Logo
