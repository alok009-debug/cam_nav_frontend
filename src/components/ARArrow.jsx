import './ARArrow.css';

const ARArrow = ({ rotation = 0, distance = 0, isClose = false }) => {
    return (
        <div className="ar-arrow-wrapper">
            <div
                className={`ar-arrow-3d ${isClose ? 'pulse' : ''}`}
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                <svg viewBox="0 0 100 100" className="arrow-svg">
                    {/* Arrow shaft */}
                    <rect x="45" y="30" width="10" height="60" fill="currentColor" rx="3" />
                    {/* Arrow head */}
                    <polygon points="50,0 75,40 25,40" fill="currentColor" />
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