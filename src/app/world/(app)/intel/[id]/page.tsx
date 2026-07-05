interface Props { params: Promise<{ id: string }> }

export default async function IntelDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="w-content-inner">
      <h1 className="w-page-title">Intelligence Brief</h1>
      <p className="w-page-sub">Brief ID: {id}</p>
    </div>
  );
}
