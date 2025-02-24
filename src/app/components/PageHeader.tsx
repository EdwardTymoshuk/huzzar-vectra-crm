const PageHeader = ({ title }: { title: string }) => {
  return (
    <div className="p-4 w-full flex items-center justify-center uppercase text-primary">
      <h1 className="font-bold text-4xl">{title}</h1>
    </div>
  )
}

export default PageHeader
