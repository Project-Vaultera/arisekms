import { Award01Icon, BookOpen01Icon, Upload01Icon } from '@hugeicons/core-free-icons';

// Shared "Add New" destinations. Uploads are admin-only (mirrors canUpload);
// report + certificate submission are open to every signed-in member.
export const ADD_ACTIONS = {
  report: { label: 'Submit Report', to: '/submit-reports', icon: Upload01Icon },
  product: {
    label: 'Add Knowledge Product',
    to: '/knowledge-products',
    icon: BookOpen01Icon,
    adminOnly: true,
  },
  certificate: { label: 'Record Certificate', to: '/skillsbuild', icon: Award01Icon },
};
