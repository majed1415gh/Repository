import React from 'react';
import { Briefcase, FileText, Receipt } from 'lucide-react';

export const MonthlySummaryCard = ({ t, competitions }) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyCompetitions = competitions.filter(c => {
        const addedDate = new Date(c.dateAdded);
        return addedDate.getMonth() === currentMonth && addedDate.getFullYear() === currentYear;
    });

    const addedCount = monthlyCompetitions.length;
    const submittedCount = monthlyCompetitions.filter(c => c.status === 'proposal_submitted').length;
    const claimsCount = monthlyCompetitions.filter(c => c.status === 'claim_submitted').length;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const count = monthlyCompetitions.filter(c => new Date(c.dateAdded).getDate() === day).length;
        return { day, count };
    });

    const maxCount = Math.max(...dailyData.map(d => d.count), 1);
    const monthName = now.toLocaleString('ar-SA', { month: 'long' });

    return (
         <div className="bg-white rounded-xl border border-slate-200 h-full overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-[#fcfcfc]">
                <h3 className="text-lg font-semibold">{t('currentMonthSummary')}</h3>
                 <span className="text-sm text-slate-500">{monthName} {currentYear}</span>
            </div>
            <div className="p-6 flex gap-6">
                <div className="flex-1 h-48 flex items-end justify-between px-2">
                    {dailyData.map(d => (
                         <div key={d.day} className="flex flex-col items-center group w-full">
                            <div className="h-full flex items-end">
                                 <div 
                                    className="w-1.5 bg-teal-200 rounded-full transition-all duration-300 group-hover:bg-teal-500"
                                    style={{ height: `${(d.count / maxCount) * 100}%`}}
                                ></div>
                            </div>
                            <span className="text-xs text-slate-400 mt-1">{d.day % 5 === 0 || d.day === 1 ? d.day : ''}</span>
                        </div>
                    ))}
                </div>
                <div className="w-48 space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-full"><Briefcase className="h-5 w-5 text-teal-600"/></div>
                        <div>
                            <p className="text-lg font-bold">{addedCount}</p>
                            <p className="text-xs text-slate-500">{t('addedCompetitions')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-full"><FileText className="h-5 w-5 text-teal-600"/></div>
                        <div>
                            <p className="text-lg font-bold">{submittedCount}</p>
                            <p className="text-xs text-slate-500">{t('submittedProposals')}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-full"><Receipt className="h-5 w-5 text-teal-600"/></div>
                        <div>
                            <p className="text-lg font-bold">{claimsCount}</p>
                            <p className="text-xs text-slate-500">{t('financialClaims')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};