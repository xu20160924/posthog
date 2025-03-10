import { LemonButton, LemonCheckbox, LemonModal, LemonTable } from '@posthog/lemon-ui'
import { useActions, useValues } from 'kea'

import { sourceWizardLogic } from '../../new/sourceWizardLogic'
import { SyncMethodForm } from './SyncMethodForm'

export default function SchemaForm(): JSX.Element {
    const { toggleSchemaShouldSync, openSyncMethodModal } = useActions(sourceWizardLogic)
    const { databaseSchema } = useValues(sourceWizardLogic)

    return (
        <>
            <div className="flex flex-col gap-2">
                <div>
                    <LemonTable
                        emptyState="No schemas found"
                        dataSource={databaseSchema}
                        columns={[
                            {
                                width: 0,
                                key: 'enabled',
                                render: (_, schema) => {
                                    return (
                                        <LemonCheckbox
                                            checked={schema.should_sync}
                                            onChange={(checked) => {
                                                if (schema.sync_type === null) {
                                                    openSyncMethodModal(schema)
                                                    return
                                                }
                                                toggleSchemaShouldSync(schema, checked)
                                            }}
                                        />
                                    )
                                },
                            },
                            {
                                title: 'Table',
                                key: 'table',
                                render: function RenderTable(_, schema) {
                                    return <span className="font-mono">{schema.table}</span>
                                },
                            },
                            {
                                title: 'Rows',
                                key: 'rows',
                                isHidden: !databaseSchema.some((schema) => schema.rows),
                                render: (_, schema) => {
                                    return schema.rows != null ? schema.rows : 'Unknown'
                                },
                            },

                            {
                                key: 'sync_type',
                                title: 'Sync method',
                                align: 'right',
                                tooltip:
                                    'Full refresh will refresh the full table on every sync, whereas incremental will only sync new and updated rows since the last sync',
                                render: (_, schema) => {
                                    if (!schema.sync_type) {
                                        return (
                                            <div className="justify-end flex">
                                                <LemonButton
                                                    className="my-1"
                                                    type="primary"
                                                    onClick={() => openSyncMethodModal(schema)}
                                                    size="small"
                                                >
                                                    Configure
                                                </LemonButton>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div className="justify-end flex">
                                            <LemonButton
                                                className="my-1"
                                                size="small"
                                                type="secondary"
                                                onClick={() => openSyncMethodModal(schema)}
                                            >
                                                {schema.sync_type === 'full_refresh' ? 'Full refresh' : 'Incremental'}
                                            </LemonButton>
                                        </div>
                                    )
                                },
                            },
                        ]}
                    />
                </div>
            </div>
            <SyncMethodModal />
        </>
    )
}

const SyncMethodModal = (): JSX.Element => {
    const { cancelSyncMethodModal, updateSchemaSyncType, toggleSchemaShouldSync } = useActions(sourceWizardLogic)
    const { syncMethodModalOpen, currentSyncMethodModalSchema } = useValues(sourceWizardLogic)

    if (!currentSyncMethodModalSchema) {
        return <></>
    }

    return (
        <LemonModal
            title={
                <>
                    Sync method for <span className="font-mono">{currentSyncMethodModalSchema.table}</span>
                </>
            }
            isOpen={syncMethodModalOpen}
            onClose={cancelSyncMethodModal}
        >
            <SyncMethodForm
                schema={currentSyncMethodModalSchema}
                onClose={cancelSyncMethodModal}
                onSave={(syncType, incrementalField, incrementalFieldType) => {
                    if (syncType === 'incremental') {
                        updateSchemaSyncType(
                            currentSyncMethodModalSchema,
                            syncType,
                            incrementalField,
                            incrementalFieldType
                        )
                    } else {
                        updateSchemaSyncType(currentSyncMethodModalSchema, syncType ?? null, null, null)
                    }

                    toggleSchemaShouldSync(currentSyncMethodModalSchema, true)
                    cancelSyncMethodModal()
                }}
            />
        </LemonModal>
    )
}
