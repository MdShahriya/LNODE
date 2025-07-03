/**
 * Structured Logging Utility
 * 
 * Provides consistent logging across the application with
 * different log levels and structured output.
 */

import type { LogEntry } from '@/types/api';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
  requestId?: string;
  userId?: string;
  walletAddress?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  private enabledLevels: Set<LogLevel>;

  constructor() {
    // Configure enabled log levels based on environment
    if (this.isDevelopment) {
      this.enabledLevels = new Set(['debug', 'info', 'warn', 'error']);
    } else if (this.isProduction) {
      this.enabledLevels = new Set(['info', 'warn', 'error']);
    } else {
      this.enabledLevels = new Set(['warn', 'error']);
    }

    // Override with environment variable if set
    const logLevel = process.env.LOG_LEVEL as LogLevel;
    if (logLevel) {
      this.setLogLevel(logLevel);
    }
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minIndex = levels.indexOf(level);
    
    if (minIndex === -1) {
      throw new Error(`Invalid log level: ${level}`);
    }

    this.enabledLevels = new Set(levels.slice(minIndex));
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      const parts = [
        `[${entry.timestamp}]`,
        `[${entry.level.toUpperCase()}]`,
        entry.message
      ];

      if (entry.context && Object.keys(entry.context).length > 0) {
        parts.push(`\nContext: ${JSON.stringify(entry.context, null, 2)}`);
      }

      if (entry.error) {
        parts.push(`\nError: ${entry.error.message}`);
        if (entry.error.stack) {
          parts.push(`Stack: ${entry.error.stack}`);
        }
      }

      return parts.join(' ');
    } else {
      // JSON format for production
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        ...entry.context,
        ...(entry.error && {
          error: {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name
          }
        })
      });
    }
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    if (!this.enabledLevels.has(entry.level)) {
      return;
    }

    const formatted = this.formatLogEntry(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('debug', message, context);
    this.output(entry);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    this.output(entry);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context);
    this.output(entry);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.output(entry);
  }

  /**
   * Log API request
   */
  apiRequest(
    method: string,
    endpoint: string,
    context?: Omit<LogContext, 'method' | 'endpoint'>
  ): void {
    this.info('API Request', {
      method,
      endpoint,
      ...context
    });
  }

  /**
   * Log API response
   */
  apiResponse(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: Omit<LogContext, 'method' | 'endpoint' | 'statusCode' | 'duration'>
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    const message = `API Response - ${statusCode}`;
    
    const entry = this.createLogEntry(level, message, {
      method,
      endpoint,
      statusCode,
      duration,
      ...context
    });
    
    this.output(entry);
  }

  /**
   * Log database operation
   */
  dbOperation(
    operation: string,
    collection: string,
    duration?: number,
    context?: LogContext
  ): void {
    this.debug('Database Operation', {
      operation,
      collection,
      duration,
      ...context
    });
  }

  /**
   * Log database error
   */
  dbError(
    operation: string,
    collection: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error('Database Error', {
      operation,
      collection,
      ...context
    }, error);
  }

  /**
   * Log performance metrics
   */
  performance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    const level = duration > 1000 ? 'warn' : 'info'; // Warn if operation takes > 1 second
    const message = `Performance: ${operation} took ${duration}ms`;
    
    const entry = this.createLogEntry(level, message, {
      operation,
      duration,
      ...context
    });
    
    this.output(entry);
  }

  /**
   * Log security event
   */
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    const message = `Security Event: ${event} (${severity})`;
    
    const entry = this.createLogEntry(level, message, {
      securityEvent: event,
      severity,
      ...context
    });
    
    this.output(entry);
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.enabledLevels = this.enabledLevels;
    
    // Override methods to include default context
    const originalMethods = ['debug', 'info', 'warn', 'error'] as const;
    
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method].bind(childLogger);
      (childLogger as unknown as Record<string, unknown>)[method] = (message: string, context?: LogContext, error?: Error) => {
        const mergedContext = { ...defaultContext, ...context };
        if (method === 'error') {
          originalMethod(message, mergedContext, error);
        } else {
          originalMethod(message, mergedContext);
        }
      };
    });
    
    return childLogger;
  }
}

// Create singleton logger instance
const logger = new Logger();

// Export logger instance and types
export { logger, Logger };
export type { LogContext };
export default logger;

// Convenience functions for common logging patterns
export const logApiRequest = (req: { method: string; url: string }, context?: LogContext) => {
  logger.apiRequest(req.method, req.url, context);
};

export const logApiResponse = (
  req: { method: string; url: string },
  statusCode: number,
  startTime: number,
  context?: LogContext
) => {
  const duration = Date.now() - startTime;
  logger.apiResponse(req.method, req.url, statusCode, duration, context);
};

export const logError = (error: Error, context?: LogContext) => {
  logger.error(error.message, context, error);
};

export const logPerformance = (operation: string, startTime: number, context?: LogContext) => {
  const duration = Date.now() - startTime;
  logger.performance(operation, duration, context);
};