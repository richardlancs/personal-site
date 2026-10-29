import About from "./components/About";
import Contact from "./components/Contact";
import Experience from "./components/Experience";
import Hero from "./components/Hero";
import Interests from "./components/Interests";
import Navbar from "./components/Navbar";
import ParkWalk from "./components/park/ParkWalk";
import Sky from "./components/park/Sky";
import Projects from "./components/Projects";
import Skills from "./components/Skills";

// The site is one walk through a park, from the front gate in the morning
// to the far gate at dusk. Each section is a spot along the way.
export default function Home() {
  return (
    <>
      <Sky />
      <Navbar />
      <main className="flex-1">
        <ParkWalk>
          <Hero />
          <About />
          <Projects />
          <Experience />
          <Interests />
          <Skills />
          <Contact />
        </ParkWalk>
      </main>
    </>
  );
}
