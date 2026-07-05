interface Props { params: Promise<{ id: string }> }

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="w-content-inner">
      <h1 className="w-page-title">News Article</h1>
      <p className="w-page-sub">Article ID: {id}</p>
    </div>
  );
}
