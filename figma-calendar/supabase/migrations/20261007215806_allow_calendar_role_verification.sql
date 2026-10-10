-- The existing postgres admin membership has INHERIT FALSE and ADMIN TRUE.
-- Permit deliberate SET ROLE for permission checks. Runtime gains no memberships.
GRANT calendar_runtime TO postgres WITH SET TRUE;
