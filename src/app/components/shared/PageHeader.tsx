const PageHeader = ({ title }: { title: string }) => {
  return (
    <div className="p-2 w-full flex items-center justify-start text-primary">
      <h1 className="font-semibold text-2xl text-center h-fit">{title}</h1>
    </div>
  )
}

export default PageHeader
