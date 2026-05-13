import React from 'react';

export const BrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <img 
    src="https://i.postimg.cc/44KrtGqc/34140cb0-11f1-4073-976b-e2a4bdcf758d.png" 
    alt="Ms Thao's English Class Logo" 
    className={`${className} object-contain`} 
  />
);
