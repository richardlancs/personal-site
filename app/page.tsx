import About from "./components/About";
import Contact from "./components/Contact";
import Experience from "./components/Experience";
import Interests from "./components/Interests";
import Navbar from "./components/Navbar";
import Hub from "./components/park/hub/Hub";
import ParkWalk from "./components/park/ParkWalk";
import Sky from "./components/park/Sky";
import Projects from "./components/Projects";
import Skills from "./components/Skills";

// The site is one walk through a park: it opens in the central clearing,
// with a path to every section, and wanders on to the far gate at dusk.
export default function Home() {
  return (
    <>
      <Sky />
      <Navbar />
      <main className="flex-1">
        <ParkWalk>
          <Hub />
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
