function getInitData(): string {
  try {
    return (window as Window & { Telegram?: { WebApp?: { initData?: string } } })
      .Telegram?.WebApp?.initData ?? ''
  } catch { return '' }
}

export async function tgNotify(text: string, userChatId?: number): Promise<void> {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, initData: getInitData(), ...(userChatId ? { userChatId } : {}) }),
    })
  } catch { /* best-effort */ }
}
