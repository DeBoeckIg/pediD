begin;

select plan(3);
select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'storage_cleanup_jobs', 'cleanup jobs table exists');

select * from finish();
rollback;
