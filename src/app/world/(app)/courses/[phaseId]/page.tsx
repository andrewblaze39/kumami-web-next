interface Props { params: Promise<{ phaseId: string }> }

export default async function CoursePhase({ params }: Props) {
  const { phaseId } = await params;
  return (
    <div className="w-content-inner">
      <h1 className="w-page-title">Course Phase</h1>
      <p className="w-page-sub">Phase: {phaseId}</p>
    </div>
  );
}
