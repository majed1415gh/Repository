// src/pages/Dashboard.jsx

import React from 'react';
import { Briefcase, Eye, ShoppingCart, Send, Award, ThumbsDown, Receipt, CheckCheck, XCircle, FileClock } from 'lucide-react';

// استيراد المكونات الفرعية
import { ActionsHubCard } from '../components/dashboard/ActionsHubCard';
import { MonthlySummaryCard } from '../components/dashboard/MonthlySummaryCard';
import { PriceDifferenceChart } from '../components/dashboard/PriceDifferenceChart';
import { AwardedSuppliersTable } from '../components/dashboard/AwardedSuppliersTable';
import { BrochureCostsCard } from '../components/dashboard/BrochureCostsCard';
// مكون StatCard يمكن أن يبقى هنا لأنه بسيط ويستخدم فقط في هذا الملف
const StatCard = ({ title, value, icon }) => {
    const Icon = icon;
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-5">
            <Icon className="h-8 w-8 text-slate-500" />
            <div>
                <p className="text-sm text-slate-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
};

const Dashboard = ({ t, navigate, onAddNewCompetition, MOCK_COMPETITIONS, MOCK_USER }) => {
    const statuses = [
        { id: 'for_review', icon: Eye },
        { id: 'brochure_purchased', icon: ShoppingCart },
        { id: 'proposal_submitted', icon: Send },
        { id: 'awarded', icon: Award },
        { id: 'not_awarded', icon: ThumbsDown },
        { id: 'claim_submitted', icon: Receipt },
        { id: 'finished', icon: CheckCheck },
        { id: 'cancelled', icon: XCircle },
        { id: 'not_submitted', icon: FileClock },
    ];
    
    const currencyFormat = (value) => value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' });

    // Calculations
    const awardedValue = MOCK_COMPETITIONS.filter(c => c.status === 'awarded' && c.supplierName === MOCK_USER.name).reduce((sum, c) => sum + (c.awardValue || 0), 0);
    const nearingDeadlineComps = MOCK_COMPETITIONS
        .filter(c => !['finished', 'cancelled', 'not_awarded', 'awarded'].includes(c.status) && new Date(c.deadline) > new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
    const notAwardedProjects = MOCK_COMPETITIONS.filter(c => c.status === 'not_awarded' && c.myBid && c.awardValue);
    const awardedProjects = MOCK_COMPETITIONS.filter(c => ((c.status === 'not_awarded' || c.status === 'awarded') && c.supplierName && c.awardValue)).slice(0, 5);

    const StatusBadge = ({ status, t }) => (
        <span className="text-sm font-medium text-slate-600">{t(`status_${status}`)}</span>
    );

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-slate-800">{t('dashboardTitle')}</h2>
            
            <div>
                <h3 className="text-xl font-semibold mb-4 text-slate-700">{t('competitionsStatus')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                    <StatCard title={t('totalCompetitions')} value={MOCK_COMPETITIONS.length} icon={Briefcase} />
                    {statuses.map(s => (
                        <StatCard key={s.id} title={t(`status_${s.id}`)} value={MOCK_COMPETITIONS.filter(c => c.status === s.id).length} icon={s.icon} />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex justify-between items-center p-4 bg-[#fcfcfc]">
                            <h3 className="text-lg font-semibold">{t('competitionsNearingDeadline')}</h3>
                            <button onClick={() => navigate('competitions')} className="text-sm font-medium text-teal-600 hover:underline">{t('viewAll')}</button>
                        </div>
                        <div className="p-6">
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 text-left rtl:text-right">
                                    <tr>
                                        <th className="p-3 font-medium">{t('competitionName')}</th>
                                        <th className="p-3 font-medium">{t('status')}</th>
                                        <th className="p-3 font-medium">{t('deadline')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {nearingDeadlineComps.map(comp => (
                                        <tr key={comp.id} className="border-t border-slate-100">
                                            <td className="p-3 font-semibold text-slate-700">{comp.name}</td>
                                            <td className="p-3"><StatusBadge status={comp.status} t={t} /></td>
                                            <td className="p-3 text-slate-500 font-medium">{new Date(comp.deadline).toLocaleDateString('ar-SA')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                           <div className="p-4 bg-[#fcfcfc]">
                               <h3 className="text-lg font-semibold">{t('financialOverview')}</h3>
                           </div>
                           <div className="p-6 text-center">
                                <p className="text-slate-600 font-medium text-sm mb-1">{t('awardedBidsValue')}</p>
                                <p className="text-3xl font-bold text-slate-800">{currencyFormat(awardedValue)}</p>
                           </div>
                        </div>
                         <BrochureCostsCard t={t} competitions={MOCK_COMPETITIONS} />
                    </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-8">
                    <ActionsHubCard t={t} navigate={navigate} onAddNewCompetition={onAddNewCompetition} />
                    <MonthlySummaryCard t={t} competitions={MOCK_COMPETITIONS} />
                </div>
            </div>

            {(notAwardedProjects.length > 0 || awardedProjects.length > 0) && (
                 <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {notAwardedProjects.length > 0 && (
                        <PriceDifferenceChart t={t} competitions={notAwardedProjects} />
                    )}
                    {awardedProjects.length > 0 && (
                        <AwardedSuppliersTable t={t} competitions={awardedProjects} />
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;