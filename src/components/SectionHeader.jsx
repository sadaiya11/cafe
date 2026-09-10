export default function SectionHeader({ eyebrow, title, subtitle, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-orange-400">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-black text-slate-900 md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-base text-slate-600 md:text-lg">{subtitle}</p> : null}
    </div>
  )
}
