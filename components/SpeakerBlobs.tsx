import React from 'react';

interface SpeakerBlobsProps {
  isDeclanActive: boolean;
  isAlexandraActive: boolean;
}

export const SpeakerBlobs: React.FC<SpeakerBlobsProps> = ({ isDeclanActive, isAlexandraActive }) => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      
      {/* 
        DECLAN BLOB (Cyan/Teal) 
      */}
      <div 
        className={`
          absolute w-[60vw] h-[60vw] rounded-full
          bg-cyan-500 blur-[100px] mix-blend-screen
          top-[-10%] left-[-10%]
          animate-blob-float-1
        `}
        style={{
          opacity: isDeclanActive ? 0.5 : 0.1,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />

      {/* 
        ALEXANDRA BLOB (Fuchsia/Purple) 
      */}
      <div 
        className={`
          absolute w-[60vw] h-[60vw] rounded-full
          bg-fuchsia-600 blur-[100px] mix-blend-screen
          bottom-[-10%] right-[-10%]
          animate-blob-float-2
        `}
        style={{
          opacity: isAlexandraActive ? 0.5 : 0.1,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />

      {/* 
        AMBIENT MOVEMENT (Deep Blue)
      */}
      <div 
        className="
          absolute top-1/2 left-1/2 w-[50vw] h-[50vw] rounded-full
          bg-blue-900/30 blur-[120px] mix-blend-screen
          animate-blob-float-3
        "
      />

      <style>{`
        @keyframes blob-float-1 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(15vw, 10vh) rotate(45deg) scale(1.1); }
          66% { transform: translate(-5vw, 20vh) rotate(10deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes blob-float-2 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-15vw, -10vh) rotate(-45deg) scale(1.1); }
          66% { transform: translate(5vw, -20vh) rotate(-10deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes blob-float-3 {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.3); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .animate-blob-float-1 {
          animation: blob-float-1 25s infinite ease-in-out;
        }
        .animate-blob-float-2 {
          animation: blob-float-2 30s infinite ease-in-out reverse;
        }
        .animate-blob-float-3 {
          animation: blob-float-3 15s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};