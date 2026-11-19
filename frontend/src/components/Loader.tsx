import TypingText from "./app/TypingText"

const WebLoader = () => {
  return (
    <div className="loader flex flex-col items-center">
      <svg
        viewBox="0 0 300 200"
        width="300"
        height="100"
        fill="none"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="
            M 0 120
            Q 50 150, 100 120
            L 100 120
            L 100 80
            L 150 40
            L 200 80
            L 200 120
            Q 250 150, 300 120
            M 150 110
            C 140 95, 120 95, 120 110
            C 120 130, 150 150, 150 150
            C 150 150, 180 130, 180 110
            C 180 95, 160 95, 150 110
          "
          className="draw"
        />
      </svg>
      <style>{`
        .draw {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw 4s linear infinite;
        }

        @keyframes draw {
          0% {
            stroke-dashoffset: 1000;
          }
          50% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 1000;
          }
        }
      `}</style>
      <TypingText words={["Cargando..."]} />
    </div>
    
  )
}

export default WebLoader
