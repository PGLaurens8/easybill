type BrandProps = {
  className?: string
  markClassName?: string
  textClassName?: string
  showTagline?: boolean
}

export default function Brand({
  className = '',
  markClassName = 'h-11 w-11',
  textClassName = 'text-left',
  showTagline = false,
}: BrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={markClassName}
      >
        <rect width="64" height="64" rx="16" fill="#30473E" />
        
        {/* Abstract Grid / Construction Plan Background */}
        <path d="M16 24H48" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <path d="M16 32H48" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <path d="M16 40H48" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <path d="M24 16V48" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <path d="M32 16V48" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <path d="M40 16V48" stroke="white" strokeOpacity="0.1" strokeWidth="1" />

        {/* The 'Q' Document / Building Icon */}
        <path
          d="M20 18C20 16.8954 20.8954 16 22 16H38L44 22V46C44 47.1046 43.1046 48 42 48H22C20.8954 48 20 47.1046 20 46V18Z"
          fill="#F4ECDC"
        />
        
        {/* Bill of Quantities Lines */}
        <path d="M26 26H38" stroke="#30473E" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 32H34" stroke="#30473E" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 38H38" stroke="#30473E" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Measured / Quantity Bracket */}
        <path
          d="M40 34V42H32"
          stroke="#B07A4F"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="44" r="5" fill="#B07A4F" />
      </svg>
      <div className={textClassName}>
        <div className="text-xl font-bold tracking-[0.08em] leading-tight text-inherit">
          Quant<span className="text-primary-400">Easy</span>
        </div>
        {showTagline ? (
          <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500 mt-0.5">
            Commercial Control
          </div>
        ) : null}
      </div>
    </div>
  )
}
