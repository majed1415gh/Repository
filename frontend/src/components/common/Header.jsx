import React from 'react';
import { Languages, LogOut } from 'lucide-react';

const Header = ({ t, language, setLanguage, user, onLogout }) => (
    <header className="bg-white border-b border-slate-200">
        <div className="flex items-center justify-between h-20 px-6 max-w-7xl mx-auto">
            <div></div>
            <div className="flex items-center gap-4">
                <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="flex items-center text-sm font-medium text-slate-600 hover:text-teal-600 p-2 rounded-full hover:bg-slate-100">
                    <Languages className="h-5 w-5" /><span className="mx-1 font-bold">{language === 'ar' ? 'EN' : 'ع'}</span>
                </button>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex items-center gap-3">
                    <img src="https://i.pravatar.cc/40?u=a042581f4e29026704d" alt="User" className="h-10 w-10 rounded-full object-cover"/>
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button onClick={onLogout} title={t('logout')} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50"><LogOut size={18}/></button>
                </div>
            </div>
        </div>
    </header>
);

export default Header;