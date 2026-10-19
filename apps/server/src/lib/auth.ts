import type { FastifyRequest } from 'fastify'

export function hasValidToken(request: FastifyRequest, token: string): boolean {
  const authorization = request.headers.authorization
  const url = new URL(request.url, 'http://localhost')
  return authorization === `Bearer ${token}` || (url.pathname === '/ws' && url.searchParams.get('token') === token)
}
