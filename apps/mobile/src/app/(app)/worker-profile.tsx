import { WorkerOperationalAccount } from '@/components/worker/worker-operational-account';
import { WorkerScreenContainer } from '@/components/worker/worker-screen-container';

export default function WorkerProfileScreen() {
  return (
    <WorkerScreenContainer activeNavigation="profile">
      <WorkerOperationalAccount />
    </WorkerScreenContainer>
  );
}
