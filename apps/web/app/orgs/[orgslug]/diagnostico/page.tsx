'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

type Option = { label: 'A' | 'B' | 'C' | 'D'; text: string; points: number }
type QuizQuestion = { id: number; question: string; options: Option[] }

// Scoring: A=0, B=1, C=3, D=5
// NOTE: You asked for “exact 25 questions”. You provided the first 10 in full + a structured summary for 11–25.
// Replace any wording here with your final “exact” list if you want it 1:1.
const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: '¿Cuánto tiempo dedicas actualmente a buscar formas de ganar dinero extra por internet?',
    options: [
      { label: 'A', text: 'Ninguno', points: 0 },
      { label: 'B', text: 'Menos de 2 horas/semana', points: 1 },
      { label: 'C', text: '5-10 horas/semana', points: 3 },
      { label: 'D', text: 'Más de 10 horas/semana', points: 5 },
    ],
  },
  {
    id: 2,
    question: '¿Has intentado alguna vez vender productos digitales o servicios online?',
    options: [
      { label: 'A', text: 'No, nunca', points: 0 },
      { label: 'B', text: 'Sí, pero no vendí nada', points: 1 },
      { label: 'C', text: 'Sí, gané menos de $5,000 MXN total', points: 3 },
      { label: 'D', text: 'Sí, gano ingresos recurrentes', points: 5 },
    ],
  },
  {
    id: 3,
    question: '¿Cuánto dinero extra te gustaría ganar al mes usando internet?',
    options: [
      { label: 'A', text: 'Menos de $5,000 MXN', points: 0 },
      { label: 'B', text: '$5,000 – $10,000 MXN', points: 1 },
      { label: 'C', text: '$10,000 – $30,000 MXN', points: 3 },
      { label: 'D', text: 'Más de $30,000 MXN', points: 5 },
    ],
  },
  {
    id: 4,
    question: '¿Qué tan cómodo te sientes usando herramientas de Inteligencia Artificial (ChatGPT, Midjourney, etc.)?',
    options: [
      { label: 'A', text: 'No las uso nunca', points: 0 },
      { label: 'B', text: 'Las he probado un poco', points: 1 },
      { label: 'C', text: 'Las uso regularmente', points: 3 },
      { label: 'D', text: 'Soy experto y las uso todos los días', points: 5 },
    ],
  },
  {
    id: 5,
    question: '¿Crees que es posible ganar dinero rápido por internet sin invertir mucho dinero?',
    options: [
      { label: 'A', text: 'No, es una estafa', points: 0 },
      { label: 'B', text: 'Tal vez, pero no sé cómo', points: 1 },
      { label: 'C', text: 'Sí, pero requiere mucho esfuerzo', points: 3 },
      { label: 'D', text: 'Sí, y con IA es más fácil que nunca', points: 5 },
    ],
  },
  {
    id: 6,
    question: '¿Tienes un negocio o proyecto paralelo actualmente?',
    options: [
      { label: 'A', text: 'No', points: 0 },
      { label: 'B', text: 'Idea nada más', points: 1 },
      { label: 'C', text: 'En desarrollo', points: 3 },
      { label: 'D', text: 'Ya genera ingresos', points: 5 },
    ],
  },
  {
    id: 7,
    question: '¿Cuánto estás dispuesto a invertir en aprendizaje para multiplicar tus ingresos?',
    options: [
      { label: 'A', text: 'Nada', points: 0 },
      { label: 'B', text: 'Menos de $500 MXN', points: 1 },
      { label: 'C', text: '$500-$2,000 MXN', points: 3 },
      { label: 'D', text: 'Lo que sea necesario', points: 5 },
    ],
  },
  {
    id: 8,
    question: '¿Has creado contenido con IA (textos, imágenes, videos)?',
    options: [
      { label: 'A', text: 'Nunca', points: 0 },
      { label: 'B', text: 'Una vez', points: 1 },
      { label: 'C', text: 'Varias veces', points: 3 },
      { label: 'D', text: 'Lo hago constantemente', points: 5 },
    ],
  },
  {
    id: 9,
    question: '¿Qué tan importante es para ti tener ingresos pasivos?',
    options: [
      { label: 'A', text: 'No me interesa', points: 0 },
      { label: 'B', text: 'Algo interesante', points: 1 },
      { label: 'C', text: 'Importante', points: 3 },
      { label: 'D', text: 'Es mi meta principal', points: 5 },
    ],
  },
  {
    id: 10,
    question: '¿Cuántas horas libres tienes al día para trabajar en un proyecto online?',
    options: [
      { label: 'A', text: 'Menos de 1', points: 0 },
      { label: 'B', text: '1-2 horas', points: 1 },
      { label: 'C', text: '3-5 horas', points: 3 },
      { label: 'D', text: 'Más de 5 horas', points: 5 },
    ],
  },
  // 11–25 (expanded from your summary; replace wording if you want it exactly 1:1)
  {
    id: 11,
    question: '¿Has usado IA para automatizar tareas?',
    options: [
      { label: 'A', text: 'No, nunca', points: 0 },
      { label: 'B', text: 'Lo intenté pero no funcionó', points: 1 },
      { label: 'C', text: 'Sí, algunas tareas', points: 3 },
      { label: 'D', text: 'Sí, automatizo tareas clave cada semana', points: 5 },
    ],
  },
  {
    id: 12,
    question: '¿Te gustaría vender productos digitales creados con IA?',
    options: [
      { label: 'A', text: 'No me interesa', points: 0 },
      { label: 'B', text: 'Tal vez algún día', points: 1 },
      { label: 'C', text: 'Sí, lo estoy considerando', points: 3 },
      { label: 'D', text: 'Sí, quiero empezar cuanto antes', points: 5 },
    ],
  },
  {
    id: 13,
    question: '¿Crees que la IA va a reemplazar muchos trabajos tradicionales?',
    options: [
      { label: 'A', text: 'No lo creo', points: 0 },
      { label: 'B', text: 'No estoy seguro', points: 1 },
      { label: 'C', text: 'Sí, en varios roles', points: 3 },
      { label: 'D', text: 'Sí, y quiero aprovechar la oportunidad antes que la mayoría', points: 5 },
    ],
  },
  {
    id: 14,
    question: '¿Estás dispuesto a aprender estrategias probadas en lugar de prueba y error?',
    options: [
      { label: 'A', text: 'Prefiero hacerlo solo', points: 0 },
      { label: 'B', text: 'Depende', points: 1 },
      { label: 'C', text: 'Sí, si me ahorra tiempo', points: 3 },
      { label: 'D', text: 'Sí, quiero un método claro y rápido', points: 5 },
    ],
  },
  {
    id: 15,
    question: '¿Has visto casos reales de personas ganando dinero con IA?',
    options: [
      { label: 'A', text: 'No, ninguno', points: 0 },
      { label: 'B', text: 'Algunos, pero no me convence', points: 1 },
      { label: 'C', text: 'Sí, varios', points: 3 },
      { label: 'D', text: 'Sí, y quiero replicarlo', points: 5 },
    ],
  },
  {
    id: 16,
    question: '¿Qué tan rápido quieres ver resultados?',
    options: [
      { label: 'A', text: 'En algunos meses', points: 0 },
      { label: 'B', text: 'En 2-3 meses', points: 1 },
      { label: 'C', text: 'En 4-6 semanas', points: 3 },
      { label: 'D', text: 'En 7-14 días', points: 5 },
    ],
  },
  {
    id: 17,
    question: '¿Tienes experiencia en marketing digital?',
    options: [
      { label: 'A', text: 'Nada', points: 0 },
      { label: 'B', text: 'Poca', points: 1 },
      { label: 'C', text: 'Intermedia', points: 3 },
      { label: 'D', text: 'Avanzada', points: 5 },
    ],
  },
  {
    id: 18,
    question: '¿Usas redes sociales para vender o promocionar?',
    options: [
      { label: 'A', text: 'No', points: 0 },
      { label: 'B', text: 'Solo publico de vez en cuando', points: 1 },
      { label: 'C', text: 'Sí, de forma constante', points: 3 },
      { label: 'D', text: 'Sí, con estrategia y enfoque en ventas', points: 5 },
    ],
  },
  {
    id: 19,
    question: '¿Estás cansado de métodos lentos para ganar dinero online?',
    options: [
      { label: 'A', text: 'No realmente', points: 0 },
      { label: 'B', text: 'Un poco', points: 1 },
      { label: 'C', text: 'Sí, demasiado', points: 3 },
      { label: 'D', text: 'Sí, quiero un camino más rápido y claro', points: 5 },
    ],
  },
  {
    id: 20,
    question: '¿Crees que 2026 es el mejor año para empezar con IA?',
    options: [
      { label: 'A', text: 'No', points: 0 },
      { label: 'B', text: 'Tal vez', points: 1 },
      { label: 'C', text: 'Sí, es una gran oportunidad', points: 3 },
      { label: 'D', text: 'Sí, y si espero pierdo ventaja', points: 5 },
    ],
  },
  {
    id: 21,
    question: '¿Quieres libertad financiera trabajando desde casa?',
    options: [
      { label: 'A', text: 'No me interesa', points: 0 },
      { label: 'B', text: 'Sería bueno', points: 1 },
      { label: 'C', text: 'Sí, es importante', points: 3 },
      { label: 'D', text: 'Sí, es mi prioridad', points: 5 },
    ],
  },
  {
    id: 22,
    question: '¿Has invertido en cursos online antes?',
    options: [
      { label: 'A', text: 'No', points: 0 },
      { label: 'B', text: 'Sí, pero no los terminé', points: 1 },
      { label: 'C', text: 'Sí, y aprendí algo útil', points: 3 },
      { label: 'D', text: 'Sí, y obtuve resultados (o estoy listo para lograrlos)', points: 5 },
    ],
  },
  {
    id: 23,
    question: '¿Qué tan motivado estás para cambiar tu situación actual?',
    options: [
      { label: 'A', text: 'Poco', points: 0 },
      { label: 'B', text: 'Algo', points: 1 },
      { label: 'C', text: 'Muy motivado', points: 3 },
      { label: 'D', text: 'Listo para actuar hoy', points: 5 },
    ],
  },
  {
    id: 24,
    question: '¿Te emociona la idea de escalar un negocio con IA?',
    options: [
      { label: 'A', text: 'No', points: 0 },
      { label: 'B', text: 'Un poco', points: 1 },
      { label: 'C', text: 'Sí', points: 3 },
      { label: 'D', text: 'Sí, quiero escalar rápido', points: 5 },
    ],
  },
  {
    id: 25,
    question: '¿Estás listo para tomar acción hoy mismo?',
    options: [
      { label: 'A', text: 'No', points: 0 },
      { label: 'B', text: 'Tal vez', points: 1 },
      { label: 'C', text: 'Sí', points: 3 },
      { label: 'D', text: 'Sí, hoy empiezo', points: 5 },
    ],
  },
]

function getTier(score: number) {
  if (score <= 30) {
    return {
      title: 'Potencial bajo – necesitas aprender lo básico',
      subtitle: 'Tu mejor jugada ahora es construir fundamentos y un sistema simple de ejecución.',
      range: '0–30 pts',
    }
  }
  if (score <= 60) {
    return {
      title: 'Buen potencial – puedes ganar $5,000-10,000 MXN/mes',
      subtitle: 'Con foco y un método probado, puedes convertir IA en ingresos constantes.',
      range: '31–60 pts',
    }
  }
  if (score <= 90) {
    return {
      title: 'Alto potencial – posible $15,000-30,000 MXN/mes',
      subtitle: 'Estás cerca de resultados grandes. Solo te falta estructura, velocidad y soporte.',
      range: '61–90 pts',
    }
  }
  return {
    title: 'Potencial élite – puedes escalar a $50,000+ MXN/mes rápido',
    subtitle: 'Tienes el perfil para escalar fuerte. Lo clave es ejecutar con un sistema y feedback.',
    range: '91–125 pts',
  }
}

export default function DiagnosticoQuizPage() {
  const params = useParams<{ orgslug: string }>()
  const orgslug = params?.orgslug

  const totalQuestions = QUESTIONS.length
  const [idx, setIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<number, Option['label']>>({})
  const [isFinished, setIsFinished] = React.useState(false)

  const current = QUESTIONS[idx]
  const selected = current ? answers[current.id] : undefined

  const totalScore = React.useMemo(() => {
    return QUESTIONS.reduce((sum, q) => {
      const chosen = answers[q.id]
      if (!chosen) return sum
      const opt = q.options.find((o) => o.label === chosen)
      return sum + (opt?.points ?? 0)
    }, 0)
  }, [answers])

  const tier = React.useMemo(() => getTier(totalScore), [totalScore])

  const progressPct = Math.round(((idx + 1) / totalQuestions) * 100)
  const canNext = Boolean(selected)

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-linear-to-br from-blue-600/10 via-white to-orange-500/10 p-6 sm:p-8 border-b border-gray-200">
            <div className="text-xs font-extrabold text-gray-700">
              Diagnóstico gratuito
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
              Diagnóstico: ¿Cuánto puedes ganar con IA en los próximos 30 días?
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Responde 25 preguntas rápidas. Al final verás tu potencial y el siguiente paso recomendado.
            </p>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Progreso</span>
                <span className="font-bold">{isFinished ? 'Completado' : `${idx + 1}/${totalQuestions}`}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FF6200] transition-[width] duration-300"
                  style={{ width: `${isFinished ? 100 : progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {isFinished ? (
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Resultado listo
                </div>
                <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-gray-900">
                  {tier.title}
                </h2>
                <p className="mt-2 text-gray-600">{tier.subtitle}</p>
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs text-gray-600">Tu puntuación</div>
                  <div className="mt-1 text-3xl font-extrabold text-gray-900">
                    {totalScore} <span className="text-sm font-semibold text-gray-500">/ 125</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-gray-600">{tier.range}</div>
                </div>

                <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
                  <div className="font-extrabold text-gray-900">La buena noticia:</div>
                  <div className="mt-1 text-gray-700">
                    con el método correcto puedes llegar al nivel élite en semanas.
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={orgslug ? `/orgs/${encodeURIComponent(orgslug)}/#precios` : '#precios'}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-[#FF6200] px-6 font-extrabold text-white shadow-sm hover:bg-[#E85800] focus:outline-hidden focus:ring-2 focus:ring-[#FF6200]/30"
                  >
                    Únete al plan PRO ahora
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-bold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-gray-400/30"
                    onClick={() => {
                      setAnswers({})
                      setIdx(0)
                      setIsFinished(false)
                    }}
                  >
                    Volver a intentarlo
                  </button>
                </div>
              </div>
            ) : (
              current && (
                <div>
                  <div className="text-xs font-bold text-gray-500">
                    Pregunta {idx + 1} de {totalQuestions}
                  </div>
                  <h2 className="mt-2 text-lg sm:text-xl font-extrabold text-gray-900">
                    {current.question}
                  </h2>

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    {current.options.map((opt) => {
                      const active = selected === opt.label
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          className={`w-full rounded-xl border px-4 py-4 text-left shadow-sm transition ${
                            active
                              ? 'border-orange-300 bg-orange-50/40 ring-1 ring-orange-200/60'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [current.id]: opt.label }))
                          }
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 h-7 w-7 shrink-0 rounded-full border flex items-center justify-center text-xs font-extrabold ${
                                active
                                  ? 'border-orange-300 bg-[#FF6200] text-white'
                                  : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              {opt.label}
                            </div>
                            <div className="text-sm sm:text-base font-semibold text-gray-900">
                              {opt.text}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-bold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-gray-400/30 disabled:opacity-50"
                      disabled={idx === 0}
                      onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Atrás
                    </button>

                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-[#FF6200] px-6 font-extrabold text-white shadow-sm hover:bg-[#E85800] focus:outline-hidden focus:ring-2 focus:ring-[#FF6200]/30 disabled:opacity-50"
                      disabled={!canNext}
                      onClick={() => {
                        if (!canNext) return
                        if (idx >= totalQuestions - 1) {
                          setIsFinished(true)
                          return
                        }
                        setIdx((i) => i + 1)
                      }}
                    >
                      {idx >= totalQuestions - 1 ? 'Ver resultado' : 'Siguiente'}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 text-xs text-gray-500">
                    Consejo: responde con honestidad — el objetivo es que veas tu potencial real y el siguiente paso para llegar a resultados en semanas.
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Nota técnica: esto es un quiz custom (multi-step) para no depender de configuración de cursos/actividades.
          Si prefieres integrarlo como curso/actividad nativa de LearnHouse, lo migramos luego.
        </div>
      </div>
    </div>
  )
}

