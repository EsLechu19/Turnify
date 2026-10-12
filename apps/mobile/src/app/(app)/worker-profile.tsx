import { WorkerProfileContent } from '@/components/worker/worker-profile-content';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';

export default function WorkerProfileScreen() {
  return (
    <WorkerScreenContainer activeNavigation="profile">
      <WorkerProfileContent />
    </WorkerScreenContainer>
  );
}
