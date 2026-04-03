import '@/styles/MovingTagline.css';

export default function MovingTagline() {
  return (
    <div className="tagline-section">
      <div className="tagline-container">
        <div className="tagline-wrapper">
          {/* Primary tagline content */}
          <div className="tagline-content">
            <span>Welcome to Kumami World</span>
            <span>Everything You Need, All in One Place</span>
            <span>Welcome to Kumami World</span>
            <span>Everything You Need, All in One Place</span>
          </div>
          {/* Duplicate content for continuous animation */}
          <div className="tagline-content" aria-hidden="true">
            <span>Welcome to Kumami World</span>
            <span>Everything You Need, All in One Place</span>
            <span>Welcome to Kumami World</span>
            <span>Everything You Need, All in One Place</span>
          </div>
        </div>
      </div>
    </div>
  );
}
