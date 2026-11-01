-- The old versions created this account at startup with the password `admin`, so nothing
-- that kept it could be trusted. Deleting it makes setup run, because no owner exists yet.
DELETE FROM `users` WHERE `username` = 'admin';
