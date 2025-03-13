import Image from 'next/image'

const LoaderLogo = () => (
  <div className="flex justify-center w-full">
    <Image src="/img/huzzar-logo.svg" width="100" height="100" alt="Loader" />
  </div>
)

export default LoaderLogo
