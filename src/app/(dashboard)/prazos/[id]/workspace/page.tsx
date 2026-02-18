import { WorkspaceView } from "@/components/prazos/workspace/workspace-view"

export default function WorkspacePage({ params }: { params: { id: string } }) {
  return <WorkspaceView deadlineId={params.id} />
}
