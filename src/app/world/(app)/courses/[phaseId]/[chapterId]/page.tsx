interface Props { params: Promise<{ phaseId: string; chapterId: string }> }

export default async function CourseChapter({ params }: Props) {
  const { phaseId, chapterId } = await params;
  return (
    <div className="w-content-inner">
      <h1 className="w-page-title">Chapter</h1>
      <p className="w-page-sub">Phase {phaseId} / Chapter {chapterId}</p>
    </div>
  );
}
