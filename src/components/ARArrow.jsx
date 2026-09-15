import './ARArrow.css';

const TILT = 60; // degrees — how far the arrow leans back onto the ground plane

const ARArrow = ({ rotation = 0, distance = 0, isClose = false }) => {
  return (
    <div className="ar-arrow-wrapper">
      <div
        className={`ar-arrow-3d ${isClose ? 'pulse' : ''}`}
        style={{
          // Tilt first (puts arrow on the "floor"), then rotate within that plane
          transform: `rotateX(${TILT}deg) rotate(${rotation}deg)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="arrow-svg">
          <defs>
            <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#86efac" />
              <stop offset="40%"  stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          {/* Outer ring — grounds the arrow visually */}
          <circle
            cx="50" cy="50" r="46"
            fill="rgba(0,0,0,0.20)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
          />

          {/* Arrow shaft */}
          <rect
            x="45" y="30" width="10" height="60"
            fill="url(#arrowGrad)"
            rx="3"
          />

          {/* Arrow head */}
          <polygon
            points="50,0 75,40 25,40"
            fill="url(#arrowGrad)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>

        <div className="arrow-glow" />
      </div>

      {distance > 0 && (
        <div className="arrow-distance-bubble">
          {Math.round(distance)}m
        </div>
      )}
    </div>
  );
};

export default ARArrow;