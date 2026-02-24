const PageHeader = ({ title }: { title: string }) => {
  return (
    <div className="px-2 py-2 w-full flex items-center justify-start text-primary">
      <h1 className="font-semibold text-xl sm:text-2xl leading-tight">{title}</h1>
    </div>
  )
}

export default PageHeader
