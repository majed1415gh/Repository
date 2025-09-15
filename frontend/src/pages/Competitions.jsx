// src/pages/Competitions.jsx

import React, { useState } from 'react';
import { PlusCircle, Search, ArrowRight, ArrowLeft, Briefcase } from 'lucide-react';
import { CompetitionCard } from '../components/competitions/CompetitionCard';

const Competitions = ({ t, onAddNewCompetition, MOCK_COMPETITIONS, onEditCompetition, onShowDetails }) => {
    const [activeStatus, setActiveStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    
    const ITEMS_PER_PAGE = 6;

    const statusTabs = [
        { id: 'all', label: t('status_tab_all') },
        { id: 'for_review', label: t('status_tab_for_review') },
        { id: 'brochure_purchased', label: t('status_tab_brochure_purchased') },
        { id: 'proposal_submitted', label: t('status_tab_proposal_submitted') },
        { id: 'awarded', label: t('status_tab_awarded') },
        { id: 'not_awarded', label: t('status_tab_not_awarded') },
        { id: 'claim_submitted', label: t('status_tab_claim_submitted') },
        { id: 'finished', label: t('status_tab_finished') },
        { id: 'cancelled', label: t('status_tab_cancelled') },
        { id: 'not_submitted', label: t('status_tab_not_submitted') },
    ];

    const filteredCompetitions = MOCK_COMPETITIONS.filter(comp => {
        const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              comp.referenceNumber.includes(searchTerm);
        const matchesStatus = activeStatus === 'all' || comp.status === activeStatus;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredCompetitions.length / ITEMS_PER_PAGE);
    const paginatedCompetitions = filteredCompetitions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">{t('allCompetitions')}</h2>
                <button onClick={onAddNewCompetition} className="py-2.5 px-5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                    <PlusCircle size={20}/> {t('newCompetition')}
                </button>
            </div>

            <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
                <div className="relative flex-grow">
                     <Search className="absolute top-1/2 -translate-y-1/2 right-4 h-5 w-5 text-slate-400" />
                     <input type="text" placeholder={t('searchByReferenceOrLink')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-50 border-transparent focus:border-transparent focus:ring-0 rounded-lg p-3 pr-12" />
                </div>
                <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg">
                    {statusTabs.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveStatus(tab.id); setCurrentPage(1); }} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeStatus === tab.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="md:hidden">
                <select onChange={(e) => { setActiveStatus(e.target.value); setCurrentPage(1); }} value={activeStatus} className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {statusTabs.map(tab => ( <option key={tab.id} value={tab.id}>{tab.label}</option> ))}
                </select>
            </div>

            {paginatedCompetitions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedCompetitions.map(comp => ( <CompetitionCard key={comp.id} comp={comp} t={t} onEdit={onEditCompetition} onShowDetails={onShowDetails} /> ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <Briefcase size={48} className="mx-auto text-slate-300" />
                    <h3 className="mt-4 text-xl font-semibold text-slate-700">لا توجد منافسات</h3>
                    <p className="mt-2 text-slate-500">لم يتم العثور على منافسات تطابق معايير البحث الحالية.</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowRight size={16} /> <span>السابق</span>
                    </button>
                    <span className="text-sm text-slate-600">{t('page')} <span className="font-bold">{currentPage}</span> {t('of')} <span className="font-bold">{totalPages}</span></span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span>التالي</span> <ArrowLeft size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Competitions;