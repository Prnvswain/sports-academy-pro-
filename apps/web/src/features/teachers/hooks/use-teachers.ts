import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

export interface TeacherRow {
  id: string;
  user: { id: string; name: string; email: string; phone: string | null; status: string };
  subject: { id: string; name: string };
  teacherClasses: { class: { id: string; name: string; grade: string | null; section: string | null } }[];
  status: string;
}

export function useTeachers(params: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['teachers', params],
    queryFn: () =>
      api.getPaginated<TeacherRow>('/teachers', {
        page: params.page ?? 1,
        pageSize: 20,
        search: params.search,
      }),
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      phone?: string;
      classIds: string[];
    }) => api.post('/teachers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher created. You can now assign subjects from their profile.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teachers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
