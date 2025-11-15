import './App.css'
import brandLogo from './assets/valio-aimo-logo.svg'
import ImageCheckFlow from './components/ImageCheckFlow'

function App() {
  return (
    <div className="app-shell">
      <section className="support-hero">
        <img src={brandLogo} alt="Valio Aimo" className="support-hero__brandmark" />
        <div className="support-hero__brand">
          <h1 className="support-hero__heading">
            Nopea apu lähetysongelmiin
          </h1>
          <p className="support-hero__text">
            Lataa kuva lähetyksestä ja anna tekoälyavustajamme tarkistaa se ennen
            yhteyttä asiantuntijoihin. Nostamme puuttuvat tuotteet esiin ja ohjaamme
            sinut oikealle tukikanavalle hetkessä.
          </p>
        </div>

        <section className="support-panel">
          <header>
            <h2 className="support-panel__title">Lähetyskuvan tarkistus</h2>
            <p>Saat ohjatun avun: tarkistamme kuvasi ja kerromme jatkotoimet.</p>
          </header>

          <ImageCheckFlow />
        </section>
      </section>
    </div>
  )
}

export default App
