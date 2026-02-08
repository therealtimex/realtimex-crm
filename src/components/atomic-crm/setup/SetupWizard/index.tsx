import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { useTranslate } from 'ra-core';
import { getIsInitialized } from '@/components/atomic-crm/providers/supabase/authProvider';

import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '@/lib/supabase-config';

import { SetupWizardProps, SSEEvent, ProvisioningResult } from './types';
import { wizardReducer, initialState } from './reducer';
import {
    normalizeSupabaseUrl,
    validateAccessToken,
    extractProjectId,
} from './validators';
import {
    fetchOrganizations,
    autoProvisionProject,
    runMigration,
    SetupApiError,
} from './api';

// Step components
import { WelcomeStep } from './steps/WelcomeStep';
import { TypeStep } from './steps/TypeStep';
import { ManagedTokenStep } from './steps/ManagedTokenStep';
import { ManagedOrgStep } from './steps/ManagedOrgStep';
import { ProvisioningStep } from './steps/ProvisioningStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { MigrationStep } from './steps/MigrationStep';

export function SetupWizard({ onComplete, open = true }: SetupWizardProps) {
    const [state, dispatch] = useReducer(wizardReducer, initialState);
    const translate = useTranslate();

    // Secure refs for sensitive data
    const accessTokenRef = useRef<string>('');
    const dbPassRef = useRef<string>('');
    const [manualAccessToken, setManualAccessToken] = useState<string>('');

    useEffect(() => {
        return () => {
            accessTokenRef.current = '';
            dbPassRef.current = '';
            setManualAccessToken('');
        };
    }, []);

    const addLog = useCallback((type: 'info' | 'error' | 'success' | 'stdout' | 'stderr', message: string) => {
        dispatch({ type: 'ADD_LOG', payload: { type, message } });
    }, []);

    const handleFetchOrgs = useCallback(async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_FETCHING_ORGS', payload: true });

        const token = state.managed.accessToken.trim();
        const validation = validateAccessToken(token);

        if (!validation.valid) {
            dispatch({ type: 'SET_ERROR', payload: validation.message || 'Invalid token' });
            dispatch({ type: 'SET_FETCHING_ORGS', payload: false });
            return;
        }

        try {
            accessTokenRef.current = token;
            const organizations = await fetchOrganizations(token);
            dispatch({ type: 'SET_ORGANIZATIONS', payload: organizations });
            dispatch({ type: 'SET_STEP', payload: 'managed-org' });
        } catch (err) {
            const error = err instanceof SetupApiError ? err : new Error(String(err));
            dispatch({ type: 'SET_ERROR', payload: error.message });
        } finally {
            dispatch({ type: 'SET_FETCHING_ORGS', payload: false });
        }
    }, [state.managed.accessToken]);

    const handleAutoProvision = useCallback(async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_STEP', payload: 'provisioning' });
        dispatch({ type: 'CLEAR_LOGS' });
        dispatch({ type: 'SET_PROVISIONING', payload: true });
        addLog('info', translate('setup.connectingProvisioning'));

        const token = accessTokenRef.current || state.managed.accessToken.trim();
        let provisionResult: ProvisioningResult | null = null;

        try {
            await autoProvisionProject(
                {
                    accessToken: token,
                    orgId: state.managed.selectedOrgId!,
                    projectName: state.managed.projectName,
                    region: state.managed.region,
                },
                (event: SSEEvent) => {
                    switch (event.type) {
                        case 'info':
                            addLog('info', event.data);
                            break;

                        case 'project_id':
                            dispatch({ type: 'SET_MANUAL_PROJECT_ID', payload: event.data });
                            break;

                        case 'success':
                            provisionResult = event.data as ProvisioningResult;
                            addLog('success', translate('setup.projectReady'));

                            // Save config immediately
                            saveSupabaseConfig({
                                url: normalizeSupabaseUrl(provisionResult.url),
                                anonKey: provisionResult.anonKey.trim(),
                            });

                            dispatch({ type: 'SET_PROVISIONING_RESULT', payload: provisionResult });
                            dbPassRef.current = provisionResult.dbPass;
                            break;

                        case 'error':
                            dispatch({ type: 'SET_ERROR', payload: event.data });
                            addLog('error', event.data);
                            break;

                        case 'done':
                            dispatch({ type: 'SET_PROVISIONING', payload: false });
                            if (event.data === 'failed') {
                                dispatch({
                                    type: 'SET_ERROR',
                                    payload: translate('setup.provisioningFailedDetails'),
                                });
                            }
                            break;
                    }
                }
            );

            dispatch({ type: 'SET_PROVISIONING', payload: false });

            // After provisioning, run migration
            if (provisionResult) {
                await handleRunMigration(
                    provisionResult.projectId,
                    token
                );
            }
        } catch (err) {
            const error = err instanceof SetupApiError ? err : new Error(String(err));
            dispatch({ type: 'SET_ERROR', payload: error.message });
            dispatch({ type: 'SET_PROVISIONING', payload: false });
            addLog('error', `Provisioning failed: ${error.message}`);
        }
    }, [state.managed.selectedOrgId, state.managed.projectName, state.managed.region, state.managed.accessToken, addLog]);

    const handleRunMigration = useCallback(
        async (
            overrideProjectId?: string,
            overrideToken?: string
        ) => {
            const targetProjectId =
                overrideProjectId ||
                state.manual.projectId ||
                extractProjectId(state.manual.url);
            const targetToken = overrideToken || accessTokenRef.current;

            if (!targetProjectId) {
                dispatch({
                    type: 'SET_ERROR',
                    payload: translate('setup.projectIdRequired'),
                });
                return;
            }

            dispatch({ type: 'SET_STEP', payload: 'migration' });
            dispatch({ type: 'CLEAR_LOGS' });
            dispatch({ type: 'SET_MIGRATING', payload: true });
            addLog('info', translate('setup.startingMigration'));

            try {
                await runMigration(
                    {
                        projectRef: targetProjectId,
                        accessToken: targetToken,
                        dbPassword: dbPassRef.current,
                    },
                    (event: SSEEvent) => {
                        switch (event.type) {
                            case 'stdout':
                            case 'info':
                                addLog('info', event.data);
                                break;
                            case 'stderr':
                            case 'error':
                                addLog('error', event.data);
                                break;
                            case 'success':
                                addLog('success', event.data);
                                break;
                        }
                    }
                );

                dispatch({ type: 'SET_MIGRATING', payload: false });
                dispatch({ type: 'SET_MIGRATION_COMPLETE', payload: true });
                dispatch({ type: 'SET_STEP', payload: 'success' });
                addLog('success', translate('setup.setupCompleteLog'));

                // Clear init_state cache so the app re-checks if database is initialized
                getIsInitialized.clearCache();

                // Complete setup - reload page to reinitialize all modules with new credentials
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (err) {
                const error = err instanceof SetupApiError ? err : new Error(String(err));
                dispatch({ type: 'SET_ERROR', payload: error.message });
                dispatch({ type: 'SET_MIGRATING', payload: false });
                addLog('error', `Migration failed: ${error.message}`);
            }
        },
        [state.manual.projectId, state.manual.url, addLog, onComplete]
    );

    const handleManualSetup = useCallback(async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_VALIDATING', payload: true });

        const url = normalizeSupabaseUrl(state.manual.url);
        const anonKey = state.manual.anonKey.trim();

        try {
            const isValid = await validateSupabaseConnection(url, anonKey);

            if (!isValid) {
                throw new Error('Failed to connect to Supabase. Please check your credentials.');
            }

            saveSupabaseConfig({ url, anonKey });

            const projectId = extractProjectId(url);
            dispatch({ type: 'SET_MANUAL_PROJECT_ID', payload: projectId });

            dispatch({ type: 'SET_VALIDATING', payload: false });

            // Check migration status and init_state
            addLog('info', translate('setup.checkingDatabase'));

            // Create a fresh Supabase client with the new credentials
            // (the global singleton hasn't been reinitialized yet)
            const { createClient } = await import('@supabase/supabase-js');
            const freshSupabase = createClient(url, anonKey);

            const { checkMigrationStatus } = await import('@/lib/migration-check');

            const migrationStatus = await checkMigrationStatus(freshSupabase);
            const needsMigration = migrationStatus.needsMigration;

            // Check if database is initialized
            const { data: initData } = await freshSupabase.from('init_state').select('is_initialized').maybeSingle();
            const isInitialized = initData?.is_initialized > 0;

            addLog('info', `Database version: ${migrationStatus.dbVersion || 'none'}`);
            addLog('info', `App version: ${migrationStatus.appVersion}`);
            addLog('info', `Needs migration: ${needsMigration}`);
            addLog('info', `Is initialized: ${isInitialized}`);

            // Decide what to do based on state
            if (!isInitialized) {
                // Database has no users - need migration to set up schema and backfill
                addLog('info', translate('setup.dbNotInitialized'));
                dispatch({ type: 'SET_STEP', payload: 'migration' });
            } else if (needsMigration && migrationStatus.dbVersion !== migrationStatus.appVersion) {
                // Database has users but is on an older version - offer migration
                addLog('info', translate('setup.dbVersionBehind', {
                    dbVersion: migrationStatus.dbVersion,
                    appVersion: migrationStatus.appVersion
                }));
                dispatch({ type: 'SET_STEP', payload: 'migration' });
            } else if (needsMigration && migrationStatus.dbVersion === migrationStatus.appVersion) {
                // Same version but legacy schema (no timestamp tracking)
                // Skip migration to avoid disrupting working database
                addLog('info', translate('setup.dbLegacySchema'));
                addLog('success', translate('setup.skippingMigration'));
                addLog('info', translate('setup.reloadingApp'));
                getIsInitialized.clearCache();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                // Database is up to date and initialized - complete setup
                addLog('success', translate('setup.dbReady'));
                addLog('info', translate('setup.reloadingApp'));
                getIsInitialized.clearCache();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            dispatch({ type: 'SET_ERROR', payload: error.message });
            dispatch({ type: 'SET_VALIDATING', payload: false });
        }
    }, [state.manual.url, state.manual.anonKey, addLog, onComplete]);

    const renderStep = () => {
        switch (state.step) {
            case 'welcome':
                return (
                    <WelcomeStep
                        onNext={() => dispatch({ type: 'SET_STEP', payload: 'type' })}
                    />
                );

            case 'type':
                return (
                    <TypeStep
                        onManaged={() => {
                            dispatch({ type: 'SET_SETUP_TYPE', payload: 'managed' });
                            dispatch({ type: 'SET_STEP', payload: 'managed-token' });
                        }}
                        onManual={() => {
                            dispatch({ type: 'SET_SETUP_TYPE', payload: 'manual' });
                            dispatch({ type: 'SET_STEP', payload: 'credentials' });
                        }}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: 'welcome' })}
                    />
                );

            case 'managed-token':
                return (
                    <ManagedTokenStep
                        accessToken={state.managed.accessToken}
                        onTokenChange={(value) =>
                            dispatch({ type: 'SET_ACCESS_TOKEN', payload: value })
                        }
                        onFetchOrgs={handleFetchOrgs}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: 'type' })}
                        error={state.error}
                        isFetching={state.fetchingOrgs}
                    />
                );

            case 'managed-org':
                return (
                    <ManagedOrgStep
                        organizations={state.managed.organizations}
                        selectedOrg={state.managed.selectedOrgId || ''}
                        projectName={state.managed.projectName}
                        region={state.managed.region}
                        onOrgSelect={(value) =>
                            dispatch({ type: 'SET_SELECTED_ORG', payload: value })
                        }
                        onProjectNameChange={(value) =>
                            dispatch({ type: 'SET_PROJECT_NAME', payload: value })
                        }
                        onRegionChange={(value) =>
                            dispatch({ type: 'SET_REGION', payload: value })
                        }
                        onProvision={handleAutoProvision}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: 'managed-token' })}
                    />
                );

            case 'provisioning':
                return (
                    <ProvisioningStep
                        logs={state.logs}
                        error={state.error}
                        onRetry={() => {
                            // Go back to org selection to try again
                            dispatch({ type: 'SET_ERROR', payload: null });
                            dispatch({ type: 'SET_STEP', payload: 'managed-org' });
                        }}
                        onSwitchToManual={() => {
                            // Switch to manual connect flow
                            dispatch({ type: 'SET_ERROR', payload: null });
                            dispatch({ type: 'SET_SETUP_TYPE', payload: 'manual' });
                            dispatch({ type: 'SET_STEP', payload: 'credentials' });
                        }}
                    />
                );

            case 'credentials':
                return (
                    <CredentialsStep
                        url={state.manual.url}
                        anonKey={state.manual.anonKey}
                        onUrlChange={(value) =>
                            dispatch({ type: 'SET_MANUAL_URL', payload: value })
                        }
                        onAnonKeyChange={(value) =>
                            dispatch({ type: 'SET_MANUAL_ANON_KEY', payload: value })
                        }
                        onSave={handleManualSetup}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: 'type' })}
                        error={state.error}
                    />
                );

            case 'migration':
                return (
                    <MigrationStep
                        logs={state.logs}
                        migrating={state.migrating}
                        complete={state.migrationComplete}
                        error={state.error}
                        accessToken={
                            state.setupType === 'managed'
                                ? (accessTokenRef.current || state.managed.accessToken)
                                : manualAccessToken
                        }
                        onTokenChange={setManualAccessToken}
                        onRunMigration={() => {
                            const projectId = state.manual.projectId || extractProjectId(state.manual.url);
                            const token = state.setupType === 'managed'
                                ? (accessTokenRef.current || state.managed.accessToken)
                                : manualAccessToken;
                            handleRunMigration(projectId, token);
                        }}
                    />
                );

            case 'success':
                return (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-2xl font-bold mb-2">
                            {translate('setup.setupComplete')}
                        </h3>
                        <p className="text-muted-foreground">
                            {translate('setup.redirecting')}
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-3xl">
                    <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl">
                        {renderStep()}
                    </div>
                </div>
            </div>
        </div>
    );
}
