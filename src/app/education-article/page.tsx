import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

// Backward-compat redirect: /education-article?id=X → /education/article/X
export default async function EducationArticleRedirect({ searchParams }: PageProps) {
  const params = await searchParams
  const id = params.id
  if (id) {
    redirect(`/education/article/${encodeURIComponent(id)}`)
  }
  redirect('/education')
}
