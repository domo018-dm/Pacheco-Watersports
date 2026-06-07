import { Suspense } from 'react'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Strip from '@/components/Strip'
import Bridge from '@/components/Bridge'
import JetSkiSection from '@/components/JetSkiSection'
import FleetSection from '@/components/FleetSection'
import FleetSkeleton from '@/components/FleetSkeleton'
import SkidSteerSection from '@/components/SkidSteerSection'
import LocalSection from '@/components/LocalSection'
import ContactSection from '@/components/ContactSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Nav />
      <main id="top">
        <Hero />
        <Strip />
        <Bridge />
        <JetSkiSection />
        <Suspense fallback={<FleetSkeleton />}>
          <FleetSection />
        </Suspense>
        <SkidSteerSection />
        <LocalSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
