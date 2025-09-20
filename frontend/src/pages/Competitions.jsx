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

            {/* صندوق البحث */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="relative flex-grow">
                     <Search className="absolute top-1/2 -translate-y-1/2 right-4 h-5 w-5 text-slate-400" />
                     <input type="text" placeholder={t('searchByReferenceOrLink')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-50 border-transparent focus:border-transparent focus:ring-0 rounded-lg p-3 pr-12" />
                </div>
            </div>
            
            {/* مراحل المنافسات */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-[#fcfcfc] border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800">مراحل المنافسات</h3>
                </div>
                
                {/* المراحل الرئيسية */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        {/* مرحلة المعاينة */}
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => { setActiveStatus('for_review'); setCurrentPage(1); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    activeStatus === 'for_review' 
                                        ? 'bg-blue-500 text-white shadow-lg scale-110' 
                                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                            >
                                <span className="text-sm font-bold">1</span>
                            </button>
                            <span className={`text-xs mt-2 font-medium ${activeStatus === 'for_review' ? 'text-blue-600' : 'text-slate-500'}`}>
                                للمعاينة
                            </span>
                        </div>

                        {/* خط الاتصال */}
                        <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

                        {/* مرحلة الشراء */}
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => { setActiveStatus('brochure_purchased'); setCurrentPage(1); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    activeStatus === 'brochure_purchased' 
                                        ? 'bg-green-500 text-white shadow-lg scale-110' 
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                            >
                                <span className="text-sm font-bold">2</span>
                            </button>
                            <span className={`text-xs mt-2 font-medium ${activeStatus === 'brochure_purchased' ? 'text-green-600' : 'text-slate-500'}`}>
                                تم الشراء
                            </span>
                        </div>

                        {/* خط الاتصال */}
                        <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

                        {/* مرحلة التقديم */}
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => { setActiveStatus('proposal_submitted'); setCurrentPage(1); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    activeStatus === 'proposal_submitted' 
                                        ? 'bg-yellow-500 text-white shadow-lg scale-110' 
                                        : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                }`}
                            >
                                <span className="text-sm font-bold">3</span>
                            </button>
                            <span className={`text-xs mt-2 font-medium ${activeStatus === 'proposal_submitted' ? 'text-yellow-600' : 'text-slate-500'}`}>
                                تم التقديم
                            </span>
                        </div>

                        {/* خط الاتصال */}
                        <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

                        {/* مرحلة الترسية */}
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => { setActiveStatus('awarded'); setCurrentPage(1); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    activeStatus === 'awarded' 
                                        ? 'bg-purple-500 text-white shadow-lg scale-110' 
                                        : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                }`}
                            >
                                <span className="text-sm font-bold">4</span>
                            </button>
                            <span className={`text-xs mt-2 font-medium ${activeStatus === 'awarded' ? 'text-purple-600' : 'text-slate-500'}`}>
                                تمت الترسية
                            </span>
                        </div>

                        {/* خط الاتصال */}
                        <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

                        {/* مرحلة المطالبة */}
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => { setActiveStatus('claim_submitted'); setCurrentPage(1); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    activeStatus === 'claim_submitted' 
                                        ? 'bg-indigo-500 text-white shadow-lg scale-110' 
                                        : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                }`}
                            >
                                <span className="text-sm font-bold">5</span>
                            </button>
                            <span className={`text-xs mt-2 font-medium ${activeStatus === 'claim_submitted' ? 'text-indigo-600' : 'text-slate-500'}`}>
                                تم تقديم المطالبة
                            </span>
                        </div>

                        {/* خط الاتصال */}
                        <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

                        {/* مرحلة الانتهاء */}
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => { setActiveStatus('finished'); setCurrentPage(1); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    activeStatus === 'finished' 
                                        ? 'bg-teal-500 text-white shadow-lg scale-110' 
                                        : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                }`}
                            >
                                <span className="text-sm font-bold">6</span>
                            </button>
                            <span className={`text-xs mt-2 font-medium ${activeStatus === 'finished' ? 'text-teal-600' : 'text-slate-500'}`}>
                                منتهية
                            </span>
                        </div>
                    </div>

                    {/* الحالات الخاصة */}
                    <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-center gap-4">
                            <button 
                                onClick={() => { setActiveStatus('all'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    activeStatus === 'all' 
                                        ? 'bg-slate-600 text-white shadow-md' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                الكل
                            </button>
                            
                            <button 
                                onClick={() => { setActiveStatus('not_awarded'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    activeStatus === 'not_awarded' 
                                        ? 'bg-orange-500 text-white shadow-md' 
                                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                }`}
                            >
                                لم تتم الترسية
                            </button>
                            
                            <button 
                                onClick={() => { setActiveStatus('cancelled'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    activeStatus === 'cancelled' 
                                        ? 'bg-red-500 text-white shadow-md' 
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                            >
                                ملغاة
                            </button>
                            
                            <button 
                                onClick={() => { setActiveStatus('not_submitted'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    activeStatus === 'not_submitted' 
                                        ? 'bg-gray-500 text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                لم يتم التقديم
                            </button>
                        </div>
                    </div>
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