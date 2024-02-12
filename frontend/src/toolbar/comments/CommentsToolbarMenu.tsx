import { IconTarget } from '@posthog/icons'
import { LemonButton, LemonTextAreaMarkdown, Spinner } from '@posthog/lemon-ui'
import { useActions, useValues } from 'kea'

import { KeyboardShortcut } from '~/layout/navigation-3000/components/KeyboardShortcut'
import { ToolbarMenu } from '~/toolbar/bar/ToolbarMenu'
import { commentsLogic } from '~/toolbar/comments/commentsLogic'

export const CommentsToolbarMenu = (): JSX.Element => {
    const { comments, commentsLoading, composedComment } = useValues(commentsLogic)
    const { setComposedComment, setComposerRef, sendComposedContent } = useActions(commentsLogic)

    return (
        <ToolbarMenu>
            <ToolbarMenu.Header>
                <h1>Comments</h1>
            </ToolbarMenu.Header>
            <ToolbarMenu.Body>
                {commentsLoading ? (
                    <Spinner />
                ) : (
                    comments.map((comment) => <div key={comment.id}>{comment.content}</div>)
                )}
                <div>
                    <LemonTextAreaMarkdown
                        data-attr="comment-composer"
                        placeholder="Start typing"
                        value={composedComment}
                        onChange={setComposedComment}
                        disabled={commentsLoading}
                        onPressCmdEnter={sendComposedContent}
                        ref={setComposerRef}
                    />
                    <div>
                        <LemonButton icon={<IconTarget />} />
                        <LemonButton
                            type="primary"
                            onClick={sendComposedContent}
                            disabledReason={!composedComment ? 'No message' : null}
                            sideIcon={<KeyboardShortcut command enter />}
                            data-attr="discussions-comment-toolbar"
                        >
                            Add comment
                        </LemonButton>
                    </div>
                </div>
            </ToolbarMenu.Body>
        </ToolbarMenu>
    )
}
