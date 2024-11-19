import React from 'react';

const Logo = ({ className = 'w-12 h-12' }) => {
  return (
    <div className={`${className} relative`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base shape - stylized trailer */}
        <path
          d="M10 70 L90 70 L80 40 L60 40 L55 25 L35 25 L30 40 L20 40 Z"
          className="fill-red-500"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Wheels */}
        <circle cx="30" cy="70" r="8" className="fill-gray-700" />
        <circle cx="70" cy="70" r="8" className="fill-gray-700" />
        {/* Location pin overlay */}
        <path
          d="M50 15 C42 15 35 22 35 30 C35 38 50 55 50 55 C50 55 65 38 65 30 C65 22 58 15 50 15 Z"
          className="fill-red-600"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="30" r="4" className="fill-white" />
      </svg>
    </div>
  );
};

export default Logo;
