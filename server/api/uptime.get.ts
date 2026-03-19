type UptimeResponse = {
  ok: true
  uptimeSeconds: number
  timestamp: string
}

export default defineEventHandler((): UptimeResponse => {
  return {
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  }
})
