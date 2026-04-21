import { getDb, auth, getDoc, doc } from "../firebase";
import { ai } from "./gemini";

export interface DiagnosticResult {
  service: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  latency?: number;
}

export async function runFullDiagnostic(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // 1. Check AI Connectivity
  try {
    const start = Date.now();
    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ping",
    });
    results.push({
      service: 'Gemini AI',
      status: 'ok',
      message: 'Connection successful',
      latency: Date.now() - start
    });
  } catch (e: any) {
    results.push({
      service: 'Gemini AI',
      status: 'error',
      message: e.message || 'Unknown AI error'
    });
  }

  // 2. Check Firestore Connectivity
  try {
    const start = Date.now();
    const dbInstance = getDb();
    // Use a non-existent doc just to check connectivity
    if (dbInstance) {
       await getDoc(doc(dbInstance, 'system', 'connectivity_check'));
       results.push({
         service: 'Firestore',
         status: 'ok',
         message: 'Database reachable',
         latency: Date.now() - start
       });
    } else {
        results.push({
            service: 'Firestore',
            status: 'error',
            message: 'Database not initialized'
        });
    }
  } catch (e: any) {
    results.push({
      service: 'Firestore',
      status: 'error',
      message: e.message || 'Database connection failed'
    });
  }

  // 3. Check Backend API (Yahoo Finance Proxy)
  try {
    const start = Date.now();
    const res = await fetch('/api/stock/AAPL');
    if (res.ok) {
      results.push({
        service: 'Market Data API',
        status: 'ok',
        message: 'Proxy server responsive',
        latency: Date.now() - start
      });
    } else {
      results.push({
        service: 'Market Data API',
        status: 'warning',
        message: `Status ${res.status}: ${res.statusText}`
      });
    }
  } catch (e: any) {
    results.push({
      service: 'Market Data API',
      status: 'error',
      message: 'Backend unreachable'
    });
  }

  // 4. Check Auth Status
  results.push({
    service: 'Auth Session',
    status: auth.currentUser ? 'ok' : 'warning',
    message: auth.currentUser ? `Signed in as ${auth.currentUser.email}` : 'User not authenticated'
  });

  return results;
}
