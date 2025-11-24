// Next.js Instrumentation Hook
// Wird beim Server-Start einmalig ausgeführt

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeServices } = await import('./lib/startup');
    initializeServices();
  }
}
