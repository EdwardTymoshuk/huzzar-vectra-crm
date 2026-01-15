import { cn } from '@/lib/utils'
import { LineWave } from 'react-loader-spinner'

type Props = {
  className?: string
}

/**
 * LoaderSpinner
 * ------------------------------------------------------
 * Displays a centered loading spinner.
 * Allows passing custom class names to control positioning
 * (e.g. margins, full-screen centering, overlays).
 */
const LoaderSpinner = ({ className }: Props) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-transparent w-auto h-auto',
        className
      )}
    >
      <LineWave color="#f94500" wrapperClass="ml-[25px]" />
    </div>
  )
}

export default LoaderSpinner
