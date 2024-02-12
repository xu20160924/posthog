import { actions, connect, events, kea, listeners, path, reducers, selectors } from 'kea'
import { loaders } from 'kea-loaders'
import { encodeParams } from 'kea-router'

import { toolbarConfigLogic, toolbarFetch } from '~/toolbar/toolbarConfigLogic'
import { CommentType } from '~/types'

import type { commentsLogicType } from './commentsLogicType'

export const commentsLogic = kea<commentsLogicType>([
    path(['toolbar', 'comments', 'commentsLogic']),
    connect(() => ({
        values: [toolbarConfigLogic, ['posthog']],
    })),
    actions({
        getComments: true,
        sendComposedContent: true,
        setComposedComment: (content: string) => ({ content }),
        setComposerRef: (ref: HTMLTextAreaElement | null) => ({ ref }),
    }),
    loaders(({ values }) => ({
        comments: [
            [] as CommentType[],
            {
                getComments: async (_, breakpoint) => {
                    const params = {
                        scope: 'Toolbar',
                        item_id: window.location.pathname,
                    }
                    const response = await toolbarFetch(`/api/projects/@current/comments${encodeParams(params, '?')}`)

                    if (response.status >= 400) {
                        toolbarConfigLogic.actions.tokenExpired()
                        return []
                    }

                    breakpoint()
                    if (!response.ok) {
                        return []
                    }
                    const result = await response.json()
                    return result.results
                },
                sendComposedContent: async (_, breakpoint) => {
                    const response = await toolbarFetch('/api/projects/@current/comments', 'POST', {
                        content: values.composedComment,
                        scope: 'Toolbar',
                        item_id: window.location.pathname,
                        item_context: { elements_chain: '' },
                    })

                    if (response.status >= 400) {
                        toolbarConfigLogic.actions.tokenExpired()
                        return []
                    }

                    breakpoint()
                    if (!response.ok) {
                        return []
                    }
                    debugger
                    return await response.json()
                },
            },
        ],
    })),
    reducers({
        composedComment: [
            '',
            { persist: true },
            {
                setComposedComment: (_, { content }) => content,
                sendComposedContentSuccess: () => '',
            },
        ],
        composerRef: [
            null as HTMLTextAreaElement | null,
            {
                setComposerRef: (_, { ref }) => ref,
            },
        ],
    }),
    selectors({}),
    listeners(() => ({})),
    events(({ actions }) => ({
        afterMount: () => {
            actions.getComments()
        },
    })),
])
