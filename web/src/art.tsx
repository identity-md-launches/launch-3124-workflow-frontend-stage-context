import { useId } from "react";
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 8h15V3L5 5m12 7h4v5h-4a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C9 1 2 9 5 16s15 2 15-13Z" />
        <path d="M3 21 15 9m-6 6v-5m0 5h5" />
      </>
    ),
    moon: <path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z" />,
    burrow: (
      <>
        <path d="M3 20v-7a9 9 0 0 1 18 0v7H3Zm5 0v-6a4 4 0 0 1 8 0v6M1 20h22" />
        <path d="m4 4 2 2M12 1v3m8 0-2 2" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    external: (
      <>
        <path d="M14 3h7v7m-1-6-9 9" />
        <path d="M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5" />
      </>
    ),
    seed: (
      <>
        <path d="M6 19C-2 9 13 1 19 3c3 7-1 23-13 16Z" />
        <path d="m6 19 9-10m-6 6 5 1m-5-1-1-4" />
      </>
    ),
    check: <path d="m4 12 5 5L20 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 3" />
      </>
    ),
  };
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.seed}
    </svg>
  );
}
export function Hamster({ sleeping = false }: { sleeping?: boolean }) {
  return (
    <g className="hamster-breathe">
      <ellipse cx="0" cy="72" rx="67" ry="12" fill="#795436" opacity=".15" />
      <ellipse cx="-43" cy="58" rx="19" ry="12" fill="#c18852" />
      <ellipse cx="43" cy="58" rx="19" ry="12" fill="#c18852" />
      <ellipse
        cx="0"
        cy="27"
        rx="60"
        ry="52"
        fill="#c78c55"
        stroke="#6e4a31"
        strokeWidth="2.5"
      />
      <circle
        cx="-40"
        cy="-32"
        r="23"
        fill="#c78c55"
        stroke="#6e4a31"
        strokeWidth="2.5"
      />
      <circle
        cx="40"
        cy="-32"
        r="23"
        fill="#c78c55"
        stroke="#6e4a31"
        strokeWidth="2.5"
      />
      <circle cx="-40" cy="-32" r="13" fill="#e9b39c" />
      <circle cx="40" cy="-32" r="13" fill="#e9b39c" />
      <ellipse
        cx="0"
        cy="3"
        rx="65"
        ry="51"
        fill="#d7a36c"
        stroke="#6e4a31"
        strokeWidth="2.5"
      />
      <path
        d="M-46 22C-32-8-13 10 0 1c13 9 32-9 46 21 13 26-80 39-92 0Z"
        fill="#f8dfb4"
      />
      <ellipse cx="0" cy="39" rx="33" ry="27" fill="#f8dfb4" />
      <g className="hamster-eyes" fill="#392d24">
        {sleeping ? (
          <>
            <path
              d="m-35 0 8 4 8-4m38 0 8 4 8-4"
              stroke="#392d24"
              strokeWidth="3"
              fill="none"
            />
          </>
        ) : (
          <>
            <ellipse cx="-27" cy="-2" rx="5" ry="6" />
            <ellipse cx="27" cy="-2" rx="5" ry="6" />
            <circle cx="-26" cy="-4" r="1.5" fill="#fff8ed" />
            <circle cx="28" cy="-4" r="1.5" fill="#fff8ed" />
          </>
        )}
      </g>
      <ellipse cx="-42" cy="12" rx="11" ry="6" fill="#d88c78" />
      <ellipse cx="42" cy="12" rx="11" ry="6" fill="#d88c78" />
      <path d="M-5 11q5-4 10 0l-5 6Z" fill="#a86b5c" />
      <path
        d="M0 17v5m0-1q-8 8-13 0m13 0q8 8 13 0"
        stroke="#6e4a31"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="m-55 12-18-3m18 10-19 2m129-9 18-3m-18 10 19 2"
        stroke="#9a704a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse
        cx="-20"
        cy="39"
        rx="10"
        ry="15"
        transform="rotate(-25 -20 39)"
        fill="#d7a36c"
        stroke="#996c46"
        strokeWidth="1.5"
      />
      <ellipse
        cx="20"
        cy="39"
        rx="10"
        ry="15"
        transform="rotate(25 20 39)"
        fill="#d7a36c"
        stroke="#996c46"
        strokeWidth="1.5"
      />
      <path d="M-8 32q8-9 16 0v15q-8 9-16 0Z" fill="#a87439" />
      <path d="M-11 33q11-16 22 0Z" fill="#695035" />
    </g>
  );
}
export function BurrowScene({ compact = false }: { compact?: boolean }) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className={`burrow-scene ${compact ? "compact" : ""}`}
      viewBox="0 0 640 430"
      role="img"
      aria-label="An illustrated hamster holds an acorn at the door of a warm little burrow. Preview artwork; each hatched pet has its own on-chain art."
    >
      <defs>
        <pattern id={id} width="19" height="19" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="3" r=".8" fill="#b4a17a" opacity=".18" />
        </pattern>
      </defs>
      <rect width="640" height="430" rx="24" fill="#e9ead8" />
      <circle cx="505" cy="73" r="31" fill="#fbf4d8" />
      <path d="M0 184Q90 110 196 174T398 162t242 1v267H0Z" fill="#c6cfad" />
      <path d="M0 234Q100 155 227 220T445 209t195 17v204H0Z" fill="#aab98c" />
      <path
        d="M0 292q82-52 158-22C230 87 416 82 479 259q90-22 161 26v145H0Z"
        fill="#889b67"
      />
      <path d="M137 298c16-174 314-198 360 0v132H137Z" fill="#a6794e" />
      <path
        d="M153 298c16-155 279-178 325 0"
        fill="none"
        stroke="#c6a678"
        strokeWidth="13"
      />
      <path d="M203 323V258a115 115 0 0 1 230 0v65Z" fill="#73533b" />
      <path d="M217 322v-65a101 101 0 0 1 202 0v65Z" fill="#e2c493" />
      <path d="M240 320v-64a78 78 0 0 1 156 0v64Z" fill="#9a734d" />
      <path d="M248 318v-62a70 70 0 0 1 140 0v62Z" fill="#77583d" />
      <path
        d="M251 255h135m-129-30h122m-105-29h90"
        stroke="#5b4432"
        strokeWidth="3"
        opacity=".45"
      />
      <ellipse cx="320" cy="336" rx="116" ry="23" fill="#c6ae7c" />
      <path d="M260 347q-16 40-57 83h251q-53-42-67-83" fill="#d4bd91" />
      <path
        d="M169 290c-23-50-36-53-45-55m30 39c-46-14-52 6-31 8m37 0c12-46 29-48 32-31"
        stroke="#4b6942"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <g fill="#6e814f">
        <ellipse
          cx="125"
          cy="240"
          rx="12"
          ry="22"
          transform="rotate(-40 125 240)"
        />
        <ellipse cx="143" cy="277" rx="18" ry="10" />
        <ellipse
          cx="185"
          cy="250"
          rx="11"
          ry="18"
          transform="rotate(28 185 250)"
        />
      </g>
      <g transform="translate(322 264)">
        <Hamster />
      </g>
      <g stroke="#50643f" strokeWidth="3" fill="none">
        <path d="M61 378v-51m0 26-16-13m16 3 17-12m476 49v-57m0 25 15-12m-15 22-17-13" />
      </g>
      <g fill="#f2e6bb">
        <circle cx="61" cy="322" r="12" />
        <circle cx="553" cy="318" r="12" />
      </g>
      <g fill="#b38843">
        <circle cx="61" cy="322" r="5" />
        <circle cx="553" cy="318" r="5" />
      </g>
      <g fill="#657b4c">
        <path d="m12 430 17-47 2 47 22-26-4 26m519 0 8-29 11 17 9-37 7 49m-495 0-3-31 16 31" />
      </g>
      <g fill="#e4c39c">
        <ellipse cx="102" cy="363" rx="13" ry="5" />
        <ellipse cx="489" cy="391" rx="18" ry="6" />
      </g>
      <g fill="#4b633d">
        <path d="M81 112q9-14 18 0-9 2-9 13-1-11-9-13m442 97q8-14 18 0-9 1-9 12-1-11-9-12" />
      </g>
      <rect
        width="640"
        height="430"
        rx="24"
        fill={`url(#${id})`}
        pointerEvents="none"
      />
    </svg>
  );
}
export function RouteArt({ route }: { route: number }) {
  return (
    <div className={`route-art route-${route}`} aria-hidden="true">
      <svg viewBox="0 0 220 82">
        <path
          d="M0 50Q50 0 110 45T220 39v43H0Z"
          fill="currentColor"
          opacity=".18"
        />
        <path
          d="M90 82q65-24 29-42t12-40"
          stroke="currentColor"
          strokeWidth="13"
          fill="none"
          opacity=".3"
        />
        <circle cx="180" cy="18" r="10" fill="currentColor" opacity=".4" />
        <path
          d="m25 65 5-23 6 23m145 8 7-24 7 24"
          stroke="currentColor"
          fill="none"
          strokeWidth="3"
        />
      </svg>
      <Icon name={["burrow", "leaf", "moon"][route]} />
    </div>
  );
}
