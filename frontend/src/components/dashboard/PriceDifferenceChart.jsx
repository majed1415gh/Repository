import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

export const PriceDifferenceChart = ({ t, competitions }) => {
    const [selectedId, setSelectedId] = useState(competitions.length > 0 ? competitions[0].id : null);

    const selectedCompetition = competitions.find(c => c.id === selectedId);

    const finalAwardValue = selectedCompetition?.awardValue || selectedCompetition?.award_amount || 0;
    const priceDifference = selectedCompetition ? selectedCompetition.myBid - finalAwardValue : 0;
    const isMyBidHigher = priceDifference > 0;

    const chartMaxValue = selectedCompetition ? Math.max(Math.abs(priceDifference), finalAwardValue) * 1.2 : 1;
    const differenceWidth = selectedCompetition ? (Math.abs(priceDifference) / chartMaxValue) * 100 : 0;
    const awardWidth = selectedCompetition ? (finalAwardValue / chartMaxValue) * 100 : 0;
    
    const currencyFormat = (value) => value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="bg-white rounded-xl border border-slate-200 h-full overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-[#fcfcfc]">
                <div className="p-3 rounded-lg bg-slate-100 text-slate-500">
                    <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">{t('priceDifferenceAnalysis')}</h3>
                    <p className="text-sm text-slate-500">{t('forNotAwardedProjects')}</p>
                </div>
            </div>
            <div className="p-6">
                <select 
                    value={selectedId || ''} 
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-6"
                >
                    <option value="" disabled>{t('selectProject')}</option>
                    {competitions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {selectedCompetition && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="w-full flex items-center h-24">
                            <div className="flex-1 flex justify-end">
                                <div className="relative h-10 bg-amber-400 rounded-l-md transition-all duration-500" style={{ width: `${differenceWidth}%` }}>
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold text-sm whitespace-nowrap px-2">
                                        {currencyFormat(priceDifference)}
                                    </span>
                                </div>
                            </div>
                            <div className="w-px h-full bg-slate-300"></div>
                            <div className="flex-1 flex justify-start">
                                <div className="relative h-10 bg-teal-500 rounded-r-md transition-all duration-500" style={{ width: `${awardWidth}%` }}>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white font-bold text-sm whitespace-nowrap px-2">
                                        {currencyFormat(finalAwardValue)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span><span className="text-slate-600">{t('yourBid')}</span></div>
                                <span className="font-bold text-slate-800">{currencyFormat(selectedCompetition.myBid)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-teal-500"></span><span className="text-slate-600">{t('finalAwardValue')}</span></div>
                                <span className="font-bold text-slate-800">{currencyFormat(finalAwardValue)}</span>
                            </div>
                            <div className="border-t border-dashed pt-3 mt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span><span className="text-slate-600">{t('priceDifference')}</span></div>
                                    <span className={`font-bold ${isMyBidHigher ? 'text-red-600' : 'text-green-600'}`}>{currencyFormat(priceDifference)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};