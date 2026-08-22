import pino from 'pino';

/**
 * Browser-mode pino logger.
 *
 * Log level is read from (highest priority first):
 *   1. window.ENV.LOG_LEVEL   — runtime injection via Docker / Kubernetes
 *   2. import.meta.env.VITE_LOG_LEVEL — Vite dev fallback
 *   3. defaults to 'info'
 *
 * Levels (lowest → highest): trace  debug  info  warn  error  fatal  silent
 */

const getLogLevel = (): string => {
    const raw = (
        (window as any).ENV?.LOG_LEVEL ||
        (import.meta as any).env?.VITE_LOG_LEVEL ||
        'info'
    ).toLowerCase();
    return raw;
};

const baseLogger = pino({
    browser: {
        asObject: true,
    },
    level: getLogLevel(),
    base: {
        agent: 'monochrome-agent-ui',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Application logger.
 *
 *   logger.info('message')
 *   logger.child('Tag').info('message')
 */
const logger = {
    trace: baseLogger.trace.bind(baseLogger),
    debug: baseLogger.debug.bind(baseLogger),
    info: baseLogger.info.bind(baseLogger),
    warn: baseLogger.warn.bind(baseLogger),
    error: baseLogger.error.bind(baseLogger),
    fatal: baseLogger.fatal.bind(baseLogger),

    /** Create a child logger that tags every message with a component name */
    child: (tag: string) => {
        const child = baseLogger.child({ component: tag });
        return {
            trace: child.trace.bind(child),
            debug: child.debug.bind(child),
            info: child.info.bind(child),
            warn: child.warn.bind(child),
            error: child.error.bind(child),
            fatal: child.fatal.bind(child),
        };
    },
};

export default logger;
