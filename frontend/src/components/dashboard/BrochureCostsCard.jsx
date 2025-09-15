import React from 'react';

export const BrochureCostsCard = ({ t, competitions }) => {
    const currencyFormat = (value) => value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' });
    const totalBrochureCost = competitions.reduce((sum, c) => sum + (c.brochureCost || 0), 0);
    const cancelledBrochureCost = competitions.filter(c => c.status === 'cancelled').reduce((sum, c) => sum + (c.brochureCost || 0), 0);
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-[#fcfcfc]">
                <h3 className="text-lg font-semibold">{t('brochureCostsOverview')}</h3>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium text-slate-600">{t('totalBrochureCosts')}</span>
                    <span className="font-bold text-slate-800">{currencyFormat(totalBrochureCost)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium text-slate-600">{t('cancelledBrochureCosts')}</span>
                    <span className="font-bold text-slate-800">{currencyFormat(cancelledBrochureCost)}</span>
                </div>
            </div>
        </div>
    );
};