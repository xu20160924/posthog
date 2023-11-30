import { status } from './status'
import { sleep } from './utils'

export class PeriodicTaskRunner {
    private result: Promise<void>
    private abortController: AbortController
    private consecutiveErrors = 0

    constructor(
        task: () => Promise<void> | void,
        intervalMs = 1000,
        minimumWaitMs = 1000,
        private healthCheckFailureThreshold: number = 1
    ) {
        this.abortController = new AbortController()

        const abortRequested = new Promise((resolve) => {
            this.abortController.signal.addEventListener('abort', resolve, { once: true })
        })

        this.result = new Promise(async (resolve) => {
            while (!this.abortController.signal.aborted) {
                // TODO: Set a timer and warn if this has gone over the interval?
                const startTimeMs = +Date.now()
                try {
                    await task()
                    this.consecutiveErrors = 0
                } catch (err) {
                    // TODO: It may make sense to allow adding backoff to the
                    // delay interval if the task errors?
                    // TODO: It would be good to log these errors to Sentry as well.
                    status.warn(
                        '⚠️',
                        'Error (%s) when running periodic task %o: %o',
                        ++this.consecutiveErrors,
                        err,
                        task
                    )
                }
                const waitTimeMs = Math.max(intervalMs - startTimeMs, minimumWaitMs)
                await Promise.race([sleep(waitTimeMs), abortRequested])
            }
            resolve()
        })
    }

    public isHealthy(): boolean {
        // TODO: Should probably also check to ensure that the result hasn't
        // settled as well, as this would indicate that the loop is no longer
        // looping
        return this.consecutiveErrors < this.healthCheckFailureThreshold
    }

    public async stop() {
        this.abortController.abort()
        await this.result // TODO: not sure it's desirable that this can throw
    }
}
