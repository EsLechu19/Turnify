import { WorkerAccountContainer } from '@/components/worker/worker-account-container';
import { WorkerProfileContent } from '@/components/worker/worker-profile-content';

export default function WorkerAccountProfileScreen() {
  return (
    <WorkerAccountContainer activeNavigation="profile">
      <WorkerProfileContent />
    </WorkerAccountContainer>
  );
}
