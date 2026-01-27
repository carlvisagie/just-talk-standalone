// Simple toast hook for error notifications
export function useToast() {
  return {
    toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
      // Simple alert for now - can be enhanced with a proper toast library later
      alert(`${title}\n\n${description}`);
    },
  };
}
