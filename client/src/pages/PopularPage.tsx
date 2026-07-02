import { Navbar } from '@/components/navbar'
import { Flame } from 'lucide-react'

export function PopularPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Popular</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Popular projects view is ready for expansion.
          </p>
        </div>
      </main>
    </div>
  )
}
