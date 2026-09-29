-- Turnify live fix: enable pgcrypto for invitation tokens.
-- crear_invitacion (0002) calls gen_random_bytes, which needs pgcrypto.
-- Found live: 'function gen_random_bytes(integer) does not exist'.
create extension if not exists pgcrypto;
