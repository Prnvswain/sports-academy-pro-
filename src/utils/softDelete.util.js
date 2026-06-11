export const NOT_DELETED = { is_deleted: false };

export const softDeletePayload = () => ({
  is_deleted: true,
  deleted_at: new Date()
});
