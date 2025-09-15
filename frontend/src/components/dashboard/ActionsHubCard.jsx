import React from 'react';
import { PlusCircle, FileText, Receipt, FilePlus, CalendarClock, UserPlus, User, Rocket } from 'lucide-react';

export const ActionsHubCard = ({ t, onAddNewCompetition, navigate }) => {
    const actions = [
        { label: t('addCompetitionAction'), icon: PlusCircle, action: onAddNewCompetition },
        { label: t('createProposalAction'), icon: FileText, action: () => navigate('competitions') },
        { label: t('createFinancialClaimAction'), icon: Receipt, action: () => navigate('competitions') },
        { label: t('addDocumentAction'), icon: FilePlus, action: () => navigate('profile') },
        { label: t('updateDocumentDateAction'), icon: CalendarClock, action: () => navigate('profile') },
        { label: t('addEmployeeAction'), icon: UserPlus, action: () => navigate('profile') },
        { label: t('companyProfileAction'), icon: User, action: () => navigate('profile') },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 h-full overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-[#fcfcfc]">
                <h3 className="text-lg font-semibold">{t('urgentActions')}</h3>
                <Rocket className="h-5 w-5 text-slate-400" />
            </div>
            <div className="p-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <div key={index} onClick={action.action} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2">
                                <Icon className="h-7 w-7 text-slate-500" />
                                <p className="text-xs font-medium text-slate-600">{action.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};