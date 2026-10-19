import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAppContext } from '@/app/useAppContext'

export function UninstallDialog() {
  const { pendingUninstall, setPendingUninstall, runPackageAction } = useAppContext()

  return (
    <AlertDialog open={Boolean(pendingUninstall)} onOpenChange={(open) => !open && setPendingUninstall(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Uninstall this app for the current user?</AlertDialogTitle>
          <AlertDialogDescription>
            <code>{pendingUninstall?.packageName}</code> will be removed for user 0. This keeps the system copy and app data, and you can restore it from History.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => pendingUninstall && void runPackageAction(pendingUninstall.packageName, 'uninstall')}
            variant="destructive"
          >
            Uninstall for user
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
