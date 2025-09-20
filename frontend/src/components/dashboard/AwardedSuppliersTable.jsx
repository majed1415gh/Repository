import React from 'react';
import { Award } from 'lucide-react';

export const AwardedSuppliersTable = ({ t, competitions }) => {
    const currencyFormat = (value) => value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' });

    return (
        <div className="bg-white rounded-xl border border-slate-200 h-full overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-[#fcfcfc]">
                 <div className="p-3 rounded-lg bg-slate-100 text-slate-500">
                    <Award className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">{t('awardedProjectsList')}</h3>
                </div>
            </div>
            <div className="overflow-y-auto max-h-96 p-6">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500 text-left rtl:text-right">
                        <tr>
                            <th className="p-3 font-medium">{t('competitionName')}</th>
                            <th className="p-3 font-medium">{t('winningSupplier')}</th>
                            <th className="p-3 font-medium">{t('awardValue')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {competitions.map(comp => (
                            <tr key={comp.id}>
                                <td className="p-3 font-semibold text-slate-700">{comp.name}</td>
                                <td className="p-3 text-slate-600">{comp.supplierName || comp.awarded_supplier}</td>
                                <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{currencyFormat(comp.awardValue || comp.award_amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};