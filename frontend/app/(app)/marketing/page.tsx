import { RequireAdmin } from '../../../src/routes/RequireAdmin'
import { MarketingWorkspace } from '../../../src/components/marketing/MarketingWorkspace'

export default function MarketingPage() {
  return (
    <RequireAdmin>
      <MarketingWorkspace />
    </RequireAdmin>
  )
}
