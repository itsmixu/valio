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
            Valion Uusi AI-palvelu jolla saat nopean vastauksen vuorokauden ympäri.
          </p>
        </div>

        <section className="support-panel">
          <header>
            <h2 className="support-panel__title">Lähetyskuvan tarkistus</h2>
            <p>Ennen kuin voit ottaa yhteyttä, ota kuva lähetyksestäsi jossa näkyy puuttuvia tuotteita.</p>
          </header>

          <ImageCheckFlow />
        </section>
      </section>
    </div>
  )
}

export default App
