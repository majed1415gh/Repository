import React from 'react';
import { Building, LayoutDashboard, Briefcase, User, PlusCircle } from 'lucide-react';

const Sidebar = ({ t, navigate, currentPage, onAddNewCompetition }) => {
    const navItems = [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { id: 'competitions', label: t('competitions'), icon: Briefcase },
        { id: 'profile', label: t('companyProfile'), icon: User },
    ];
    return (
        <aside className="w-64 bg-slate-800 text-slate-300 flex-col h-screen sticky top-0 hidden lg:flex">
            <div className="flex items-center justify-center p-6">
                <Building className="h-8 w-8 text-teal-400" />
                <h1 className="ms-3 text-2xl font-bold text-white">{t('appName')}</h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); navigate(item.id); }} className={`flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-slate-700 hover:text-white ${currentPage === item.id ? 'bg-slate-700 text-teal-400 font-semibold' : 'text-slate-300'}`}>
                        <item.icon className="h-5 w-5" /><span className="ms-4">{item.label}</span>
                    </a>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-700">
                <button onClick={onAddNewCompetition} className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                    <PlusCircle size={20}/>{t('newCompetition')}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;