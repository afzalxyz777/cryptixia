// components/MintForm.tsx
import dynamic from 'next/dynamic';

const MintFormClient = dynamic(() => import('./MintFormClient'), {
  ssr: false,
  loading: () => <div>Loading mint form...</div>
});

function MintForm() {
  return <MintFormClient />;
}

export default MintForm;