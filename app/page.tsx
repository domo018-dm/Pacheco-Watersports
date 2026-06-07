import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Strip from '@/components/Strip'
import Bridge from '@/components/Bridge'
import JetSkiSection from '@/components/JetSkiSection'
import FleetSection from '@/components/FleetSection'
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
        <FleetSection />
        <SkidSteerSection />
        <LocalSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
