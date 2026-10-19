import type { PropsWithChildren } from 'react'
import { AppContext } from './context'
import { useAppController } from './useAppController'

export function AppProvider({ children }: PropsWithChildren) {
  const value = useAppController()
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
