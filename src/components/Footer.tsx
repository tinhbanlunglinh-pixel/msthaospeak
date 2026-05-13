import React from 'react';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => (
  <footer className="bg-brand-green-dark text-white py-10 sm:py-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
        {/* Brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-white rounded-2xl border-4 border-brand-yellow">
              <BrandLogo className="w-16 h-16" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-brand-yellow uppercase tracking-tight">Ms Thao's English Class</h3>
            <p className="text-slate-300 font-serif italic text-sm mt-1">"Fly high with English. Ms Thao's English class"</p>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-6">
          <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
            LIÊN HỆ
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/10" />
          </h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 group">
              <span className="text-brand-green mt-1">📍</span>
              <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">839/15 Nguyễn Trung Trực, Rạch Giá, An Giang.</span>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="text-brand-green mt-1">📞</span>
              <span className="text-sm font-black group-hover:text-brand-yellow transition-colors cursor-pointer">Ms Thao: 0949 573 829</span>
            </li>
          </ul>
        </div>

        {/* Slogan */}
        <div className="space-y-6">
          <h4 className="text-brand-yellow font-black uppercase tracking-[0.2em] relative inline-block">
            SLOGAN
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/10" />
          </h4>
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
            <p className="text-lg font-serif italic text-white font-bold leading-relaxed">
              "Fly high with English. Ms Thao's English class"
            </p>
            <div className="h-0.5 bg-white/10 w-full" />
            <p className="text-base font-black text-brand-green uppercase tracking-widest text-[13px]">
              VƯƠN CAO CÙNG TIẾNG ANH.
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
);
