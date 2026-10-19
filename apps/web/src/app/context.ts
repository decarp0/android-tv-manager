import { createContext } from 'react'
import { useAppController } from './useAppController'

export const AppContext = createContext<ReturnType<typeof useAppController> | null>(null)
