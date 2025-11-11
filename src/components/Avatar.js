import React from 'react';

function Avatar({ step }) {
  const getAvatarState = () => {
    switch(step) {
      case 1:
        return { emoji: '🧔', position: '7%', message: 'Choose your service', icon: '✂️', label: 'Service' };
      case 2:
        return { emoji: '🧔✨', position: '28%', message: 'Pick your add-ons', icon: '⭐', label: 'Add-ons' };
      case 3:
        return { emoji: '🧔📅', position: '50%', message: 'Select date & time', icon: '📅', label: 'Schedule' };
      case 4:
        return { emoji: '🧔💈', position: '72%', message: 'Choose your barber', icon: '💈', label: 'Barber' };
      case 5:
        return { emoji: '🧔✅', position: '93%', message: 'Confirm booking!', icon: '✓', label: 'Confirm' };
      default:
        return { emoji: '🧔', position: '7%', message: 'Ready?', icon: '🎯', label: 'Start' };
    }
  };

  const avatarState = getAvatarState();

  const getStepInfo = (stepNum) => {
    const states = [
      { icon: '✂️', label: 'Service' },
      { icon: '⭐', label: 'Add-ons' },
      { icon: '📅', label: 'Schedule' },
      { icon: '💈', label: 'Barber' },
      { icon: '✓', label: 'Confirm' }
    ];
    return states[stepNum - 1];
  };

  return (
    <div className="avatar-journey">
      <div className="journey-path">
        <div className="path-line"></div>
        <div className="path-progress" style={{ width: avatarState.position }}></div>
        {[1, 2, 3, 4, 5].map(checkpoint => {
          const stepInfo = getStepInfo(checkpoint);
          const positions = [7, 28, 50, 72, 93];
          return (
            <div
              key={checkpoint}
              className={`checkpoint ${step >= checkpoint ? 'completed' : ''} ${step === checkpoint ? 'current' : ''}`}
              style={{ left: `${positions[checkpoint - 1]}%` }}
              title={stepInfo.label}
            >
              <div className="checkpoint-icon">
                {step > checkpoint ? '✓' : stepInfo.icon}
              </div>
              <div className="checkpoint-label">{stepInfo.label}</div>
            </div>
          );
        })}
      </div>
      <div className="avatar" style={{ left: avatarState.position }}>
        <div className="avatar-character">{avatarState.emoji}</div>
        <div className="avatar-speech-bubble">
          <strong>{avatarState.label}</strong>
          <div>{avatarState.message}</div>
        </div>
      </div>
    </div>
  );
}

export default Avatar;
