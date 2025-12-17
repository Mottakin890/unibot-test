
import { AuditLog, User } from '../types';

const LOG_KEY = 'unibot_db_audit_logs';

export class Logger {
  
  private static getLogs(): AuditLog[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(LOG_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static saveLog(log: AuditLog) {
    if (typeof window === 'undefined') return;
    const logs = this.getLogs();
    // Keep only last 1000 logs to prevent storage overflow
    if (logs.length > 1000) logs.pop(); 
    logs.unshift(log);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  }

  static log(
    user: User | null, 
    action: string, 
    targetResource: string, 
    details: string = '', 
    severity: 'info' | 'warning' | 'critical' = 'info'
  ) {
    if (typeof window === 'undefined') return;

    if (!user) {
        // Log system events or anonymous attempts
        console.warn(`[Audit] Anonymous Action: ${action}`);
        return; 
    }

    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      workspaceId: user.workspaceId,
      actorId: user.id,
      actorName: user.fullName,
      action: action.toUpperCase(),
      targetResource,
      details,
      timestamp: new Date(),
      severity,
      ip: '192.168.x.x' // Simulated Client IP
    };

    this.saveLog(newLog);
    console.log(`[Audit][${severity.toUpperCase()}] ${action} by ${user.email}`);
  }

  static getWorkspaceLogs(workspaceId: string): AuditLog[] {
      const logs = this.getLogs();
      return logs
        .filter(l => l.workspaceId === workspaceId)
        .map(l => ({...l, timestamp: new Date(l.timestamp)}));
  }
}
