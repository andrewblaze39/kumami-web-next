export interface ArticleSectionContent {
  type: 'paragraph' | 'image' | 'youtube'
  text?: string
  src?: string
  alt?: string
  caption?: string
  videoId?: string
  title?: string
}

export interface ArticleSection {
  title: string
  content: ArticleSectionContent[]
}

export interface EducationArticleDoc {
  title: string
  author: string
  level: number | string      // number going forward, string legacy
  chapterIndex: number
  thumbnail: string
  sections: ArticleSection[]
  status: 'published' | 'draft'
  blurb: string
  minutes: number
  featured: boolean
  description: string
  comingSoon?: boolean
  createdAt: unknown           // Firestore Timestamp
}

// Hydrated version with Firestore doc ID
export interface EducationArticle extends EducationArticleDoc {
  id: string
}
