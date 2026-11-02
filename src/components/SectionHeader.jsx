export default function SectionHeader({ eyebrow, title, subtitle, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.24em] text-orange-500 sm:text-sm">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="customer-section-heading text-2xl font-black tracking-tight text-[#006491] sm:text-3xl md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{subtitle}</p> : null}
    </div>
  )
}
