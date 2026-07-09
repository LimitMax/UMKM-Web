-- Migration Phase 7B.5: Remove demo profiles
DELETE FROM public.profiles
WHERE id IN ('profile-admin-1', 'profile-cashier-1');
