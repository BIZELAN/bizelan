import type { Metadata } from 'next'
import { GraduationCap } from 'lucide-react'
import { CourseCard } from '@/components/public/cards'
import { EmptyState } from '@/components/ui/misc'
import { getPublishedCourses } from '@/lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Formations',
  description:
    'Les formations en ligne BIZELAN : des parcours concrets pour structurer, chiffrer et financer votre projet.',
}

export default async function CoursesPage() {
  const courses = await getPublishedCourses()

  return (
    <>
      <section className="border-b border-surface-700 bg-surface-900">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow mb-3">Formations en ligne</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">
            Des parcours faits pour être appliqués, pas seulement suivis
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-onDark-md">
            Chaque formation combine des séquences vidéo courtes et des supports de travail
            réutilisables, pour que vous repartiez avec un livrable concret.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          {courses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="Aucune formation publiée pour le moment"
              description="Les formations apparaîtront ici dès leur publication depuis l’espace d’administration."
            />
          )}
        </div>
      </section>
    </>
  )
}
