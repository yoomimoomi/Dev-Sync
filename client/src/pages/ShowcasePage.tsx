import { Navbar } from '@/components/navbar'
import { Sparkles } from 'lucide-react'

export function ShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Showcase</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Showcase page is now routable and ready for featured content.
          </p>
        </div>
      </main>
    </div>
  )
}
