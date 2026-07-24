import { Link } from 'react-router-dom';
import {
  MapPin, Compass, Users, Sparkles, Vote, Share2, ArrowRight,
  CheckCircle2, Star, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const features = [
  {
    icon: Users,
    title: 'Colabore em grupo',
    description: 'Convide amigos e família com um simples link ou chave de acesso. Todo mundo participa das escolhas.',
  },
  {
    icon: MapPin,
    title: 'Mapa interativo',
    description: 'Adicione lugares direto no mapa — restaurantes, bares, pontos turísticos ou qualquer rolê que combinarem.',
  },
  {
    icon: Vote,
    title: 'Votação de lugares',
    description: 'Cada pessoa vota nos lugares favoritos, e o grupo decide junto o roteiro final sem estresse.',
  },
  {
    icon: Sparkles,
    title: 'Roteiro com IA',
    description: 'Gere sugestões e dicas inteligentes por dia de viagem, otimizadas para o grupo em segundos.',
  },
];

const steps = [
  { title: 'Crie um grupo', description: 'Dê um nome e um destino ou tema — viagem, jantar, happy hour, o que quiser.' },
  { title: 'Convide a galera', description: 'Compartilhe o link ou a chave de acesso para todos entrarem em segundos.' },
  { title: 'Monte o rolê juntos', description: 'Adicionem lugares, votem e organizem o roteiro final sem grupo de WhatsApp bagunçado.' },
];

const testimonials = [
  { name: 'Marina S.', role: 'Viagem para Lisboa', quote: 'Finalmente paramos de perder mensagens no WhatsApp. Todo mundo vota e o roteiro sai sozinho!' },
  { name: 'Lucas R.', role: 'Grupo de restaurantes', quote: 'Uso até para escolher onde jantar com a galera do trabalho. Simples e rápido.' },
  { name: 'Beatriz A.', role: 'Viagem em família', quote: 'A IA sugeriu um roteiro por dia que economizou horas de pesquisa. Recomendo demais.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" aria-label="Navegação principal">
          <a href="#top" className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Compass size={18} />
            </div>
            <span className="font-bold text-gray-800">Rolê Junto 🧭</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#recursos" className="hover:text-indigo-600 transition">Recursos</a>
            <a href="#como-funciona" className="hover:text-indigo-600 transition">Como funciona</a>
            <a href="#depoimentos" className="hover:text-indigo-600 transition">Depoimentos</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition px-3 py-2">
              Entrar
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Criar conta grátis
            </Link>
          </div>

          <button className="md:hidden text-gray-600" onClick={() => setMenuOpen(m => !m)} aria-label="Abrir menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-3 text-sm font-medium text-gray-600">
            <a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
            <a href="#depoimentos" onClick={() => setMenuOpen(false)}>Depoimentos</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Entrar</Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="bg-indigo-600 text-white text-center px-4 py-2 rounded-lg"
            >
              Criar conta grátis
            </Link>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500">
          <MapPin size={220} className="absolute -left-12 -top-16 text-white/10 rotate-[-15deg]" />
          <Compass size={260} className="absolute -right-16 -bottom-20 text-white/10 rotate-[12deg]" />
          <Star size={72} className="absolute right-1/4 top-10 text-white/10 hidden sm:block" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full mb-5">
              <Sparkles size={13} /> Novo: roteiros gerados por IA
            </span>
            <h1 className="text-white text-3xl sm:text-5xl font-extrabold leading-tight max-w-3xl">
              Organize qualquer rolê em grupo, sem enrolação
            </h1>
            <p className="text-indigo-100 mt-4 text-base sm:text-lg max-w-2xl">
              Crie um grupo, convide a galera e montem juntos a lista de lugares no mapa — viagens,
              restaurantes, bares ou qualquer plano. Vote, decida e vá.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition shadow-lg"
              >
                Comece grátis agora <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="text-indigo-100/80 text-xs mt-4">Grátis para começar. Sem cartão de crédito.</p>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">+1.000</p>
              <p className="text-xs sm:text-sm text-gray-500">Grupos criados</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">+8.000</p>
              <p className="text-xs sm:text-sm text-gray-500">Lugares salvos</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">4.9/5</p>
              <p className="text-xs sm:text-sm text-gray-500">Avaliação média</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Tudo que o seu grupo precisa</h2>
            <p className="text-gray-500 mt-3">
              Ferramentas simples para tirar planos do papel e transformar em roteiro de verdade.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                <div className="bg-indigo-50 text-indigo-600 w-11 h-11 rounded-xl flex items-center justify-center mb-4">
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="bg-gray-50 py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Como funciona</h2>
              <p className="text-gray-500 mt-3">Em menos de 2 minutos seu grupo já está organizando o rolê.</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="depoimentos" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Quem usa, recomenda</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map(t => (
              <figure key={t.name} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex gap-0.5 text-amber-400 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <blockquote className="text-sm text-gray-600 leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-gray-800">{t.name}</span>
                  <span className="text-gray-400"> · {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-indigo-600 to-blue-600 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Pronto para organizar o próximo rolê?
            </h2>
            <p className="text-indigo-100 mt-3">
              Crie sua conta gratuitamente e monte o roteiro com o seu grupo hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition shadow-lg"
              >
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition"
              >
                Entrar
              </Link>
            </div>
            <div className="flex items-center justify-center gap-4 text-indigo-100 text-xs mt-6 flex-wrap">
              <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Grátis para começar</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1"><Share2 size={14} /> Convide quantos amigos quiser</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1 rounded-md">
              <Compass size={14} />
            </div>
            <span className="font-semibold text-gray-700">Rolê Junto</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Rolê Junto. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

